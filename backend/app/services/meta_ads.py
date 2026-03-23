import asyncio
import httpx
import json
import logging
import os
import random
import time
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# Meta API error codes → PT-BR messages + suggested actions
META_ERROR_MAP = {
    1: {"message": "Erro temporario no servidor do Meta. Tentando novamente...", "action": "retry", "retryable": True},
    4: {"message": "Limite de requisicoes do aplicativo atingido. Aguardando...", "action": "retry", "retryable": True},
    17: {"message": "Limite de requisicoes do usuario atingido. Aguardando...", "action": "retry", "retryable": True},
    100: {"message": "Parametro invalido na requisicao.", "action": "check_params", "retryable": False},
    102: {"message": "Sessao expirada. Reconecte sua conta Meta.", "action": "reconnect", "retryable": False},
    190: {"message": "Token de acesso invalido ou expirado. Reconecte sua conta Meta nas Configuracoes.", "action": "reconnect", "retryable": False},
    200: {"message": "Permissao negada. Sua conta pode nao ter acesso a este recurso.", "action": "check_permissions", "retryable": False},
    294: {"message": "Permissao ads_management nao concedida. Reconecte sua conta Meta.", "action": "reconnect", "retryable": False},
    613: {"message": "Limite de chamadas a conta de anuncios atingido. Aguardando...", "action": "retry", "retryable": True},
    1885272: {"message": "Orcamento diario abaixo do minimo permitido. Aumente para pelo menos R$20/dia.", "action": "increase_budget", "retryable": False},
    1885621: {"message": "Orcamento definido no nivel errado. Verifique as configuracoes da campanha.", "action": "check_budget", "retryable": False},
    2606: {"message": "Nao foi possivel visualizar o anuncio. Verifique o criativo.", "action": "check_creative", "retryable": False},
    2635: {
        "message": "Erro de pagamento Meta Ads: Verifique se: (1) Sua conta de anuncios esta vinculada a um portfolio com forma de pagamento ativa, (2) Seu app Meta esta no modo LIVE (nao Development), (3) A forma de pagamento tem saldo suficiente. Acesse business.facebook.com > Configuracoes > Pagamentos para verificar.",
        "action": "check_payment",
        "retryable": False,
    },
    1487930: {
        "message": "Seu app Meta precisa ser ativado para criar anuncios. Acesse developers.facebook.com/apps, selecione seu app e ative o modo Live no topo da pagina.",
        "action": "app_mode",
        "retryable": False,
    },
}

# Ad account status codes
ACCOUNT_STATUS_MAP = {
    1: {"status": "active", "message": "Conta ativa e operacional."},
    2: {"status": "disabled", "message": "Conta desativada. Possivel violacao de politica. Acesse business.facebook.com para mais detalhes."},
    3: {"status": "unsettled", "message": "Conta com pagamento pendente. Regularize em https://www.facebook.com/ads/manager/account_settings/account_billing/."},
    7: {"status": "pending_review", "message": "Conta em analise pelo Meta. Aguarde a conclusao."},
    8: {"status": "pending_settlement", "message": "Conta aguardando processamento de pagamento."},
    9: {"status": "grace_period", "message": "Problema de pagamento detectado. Regularize antes que a conta seja suspensa."},
    100: {"status": "pending_closure", "message": "Conta em processo de encerramento."},
    101: {"status": "closed", "message": "Conta permanentemente encerrada."},
}


def parse_meta_error(response_data: dict, status_code: int = 0) -> dict:
    """Parse Meta API error response into structured error with PT-BR message."""
    error_obj = response_data.get("error", {})
    error_code = error_obj.get("code", 0)
    error_subcode = error_obj.get("error_subcode", 0)

    # Get mapped error info
    error_info = META_ERROR_MAP.get(error_code, {
        "message": f"Erro {error_code} da API Meta.",
        "action": "unknown",
        "retryable": False,
    })

    # Prefer Meta's user-friendly message if available
    user_msg = error_obj.get("error_user_msg") or error_info["message"]
    technical_msg = error_obj.get("message", "")

    # Detect development mode error by message text (Meta doesn't always use consistent error codes)
    combined_text = (technical_msg + " " + (error_obj.get("error_user_msg", "") or "")).lower()
    if "modo de desenvolvimento" in combined_text or "development mode" in combined_text:
        dev_mode_info = META_ERROR_MAP.get(1487930, {})
        if dev_mode_info:
            user_msg = dev_mode_info["message"]
            error_info = dev_mode_info

    # Detect payment/billing errors by code and subcode ONLY (not keyword matching)
    payment_error_codes = {2635}
    payment_error_subcodes = {1885717}

    is_payment_error = (
        error_code in payment_error_codes
        or error_subcode in payment_error_subcodes
    )
    if is_payment_error:
        user_msg = (
            f"Erro de pagamento Meta Ads: {technical_msg}\n\n"
            "Verifique se: (1) Sua conta de anuncios esta vinculada a um portfolio com forma de pagamento ativa, "
            "(2) Seu app Meta esta no modo LIVE (nao Development), "
            "(3) A forma de pagamento tem saldo suficiente. "
            "Acesse business.facebook.com > Configuracoes > Pagamentos para verificar."
        )
        error_info = {"message": user_msg, "action": "check_payment", "retryable": False}

    # Token expiry subcodes
    is_token_expired = error_code == 190 or error_code == 102

    return {
        "error_code": error_code,
        "error_subcode": error_subcode,
        "user_message": user_msg,
        "technical_message": technical_msg,
        "action": error_info["action"],
        "retryable": error_info["retryable"],
        "is_token_expired": is_token_expired,
        "is_payment_error": is_payment_error,
    }


class MetaAdsService:
    def __init__(self, access_token: str = "", ad_account_id: str = "", page_id: str = ""):
        self.access_token = access_token
        # Normalize ad_account_id to always include act_ prefix required by Meta API
        if ad_account_id and not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        self.ad_account_id = ad_account_id
        self.page_id = page_id
        self.base_url = "https://graph.facebook.com/v22.0"
        self.is_mock = not (access_token and ad_account_id)

    async def _request_with_retry(self, method: str, url: str, max_retries: int = 3, **kwargs) -> httpx.Response:
        """Make HTTP request with exponential backoff retry for transient errors."""
        last_response = None
        for attempt in range(max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    if method == "GET":
                        response = await client.get(url, **kwargs)
                    else:
                        response = await client.post(url, **kwargs)

                    last_response = response

                    if response.status_code == 200:
                        return response

                    # Parse error to check if retryable
                    try:
                        error_data = response.json()
                        parsed = parse_meta_error(error_data, response.status_code)

                        if parsed["retryable"] and attempt < max_retries:
                            wait_time = (2 ** attempt) + random.uniform(0, 1)
                            print(f"Meta API retryable error (code {parsed['error_code']}), attempt {attempt + 1}/{max_retries}, waiting {wait_time:.1f}s")
                            await asyncio.sleep(wait_time)
                            continue
                    except Exception:
                        pass

                    return response

            except (httpx.TimeoutException, httpx.ConnectError) as e:
                if attempt < max_retries:
                    wait_time = (2 ** attempt) + random.uniform(0, 1)
                    print(f"Connection error: {e}, attempt {attempt + 1}/{max_retries}, waiting {wait_time:.1f}s")
                    await asyncio.sleep(wait_time)
                    continue
                raise

        return last_response

    async def check_app_mode(self, app_id: str = "") -> Dict:
        """Check if the Meta App is in Development or Live mode.

        Uses a lightweight API call to detect development mode.
        If error 1487930 is returned or the response indicates dev mode,
        returns mode='development'. Otherwise returns mode='live'.
        """
        if self.is_mock:
            return {"mode": "unknown", "app_id": "", "app_name": "", "is_mock": True}

        if not app_id:
            return {"mode": "unknown", "app_id": "", "app_name": "", "error": "App ID nao configurado."}

        try:
            # First, get basic app info
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/{app_id}",
                    params={
                        "access_token": self.access_token,
                        "fields": "id,name,category",
                    },
                )

                app_name = ""
                if response.status_code == 200:
                    data = response.json()
                    app_name = data.get("name", "")
                elif response.status_code != 200:
                    error_data = response.json() if response.text else {}
                    parsed = parse_meta_error(error_data, response.status_code)
                    # Error 1487930 directly means development mode
                    if parsed["error_code"] == 1487930 or parsed["action"] == "app_mode":
                        return {"mode": "development", "app_id": app_id, "app_name": app_name}
                    return {"mode": "unknown", "app_id": app_id, "app_name": app_name, "error": parsed["user_message"]}

            # Try a lightweight ad-related call to detect dev mode restrictions
            # Fetching the ad account info is a good test
            if self.ad_account_id:
                test_response = await self._request_with_retry(
                    "GET",
                    f"{self.base_url}/{self.ad_account_id}",
                    max_retries=0,
                    params={
                        "access_token": self.access_token,
                        "fields": "account_status,name",
                    },
                )
                if test_response.status_code != 200:
                    error_data = test_response.json() if test_response.text else {}
                    parsed = parse_meta_error(error_data, test_response.status_code)
                    combined_text = (parsed.get("technical_message", "") + " " + parsed.get("user_message", "")).lower()
                    if parsed["error_code"] == 1487930 or parsed["action"] == "app_mode" or "development mode" in combined_text or "modo de desenvolvimento" in combined_text:
                        return {"mode": "development", "app_id": app_id, "app_name": app_name}

            # If we got here without errors, the app can make API calls successfully
            return {"mode": "live", "app_id": app_id, "app_name": app_name}

        except Exception as e:
            return {"mode": "unknown", "app_id": app_id, "app_name": "", "error": f"Erro ao verificar modo do app: {str(e)}"}

    async def check_account_status(self) -> Dict:
        """Check if ad account is active and operational."""
        if self.is_mock:
            return {"status": 1, "status_label": "active", "message": "Conta simulada (modo mock).", "is_ok": True}
        try:
            response = await self._request_with_retry(
                "GET",
                f"{self.base_url}/{self.ad_account_id}",
                params={
                    "access_token": self.access_token,
                    "fields": "account_status,name,currency,amount_spent,balance,funding_source,disable_reason",
                },
            )
            if response.status_code == 200:
                data = response.json()
                status_code = data.get("account_status", 0)
                status_info = ACCOUNT_STATUS_MAP.get(status_code, {"status": "unknown", "message": f"Status desconhecido ({status_code})."})
                return {
                    "status": status_code,
                    "status_label": status_info["status"],
                    "message": status_info["message"],
                    "is_ok": status_code == 1,
                    "account_name": data.get("name", ""),
                    "currency": data.get("currency", ""),
                    "has_payment": bool(data.get("funding_source")),
                    "disable_reason": data.get("disable_reason", 0),
                }
            else:
                error_data = response.json() if response.text else {}
                parsed = parse_meta_error(error_data, response.status_code)
                return {"status": 0, "status_label": "error", "message": parsed["user_message"], "is_ok": False, "is_token_expired": parsed.get("is_token_expired", False)}
        except Exception as e:
            return {"status": 0, "status_label": "error", "message": f"Erro ao verificar conta: {str(e)}", "is_ok": False}

    async def check_token_validity(self) -> Dict:
        """Check if the current access token is still valid."""
        if self.is_mock or not self.access_token:
            return {"valid": not self.is_mock and bool(self.access_token), "is_mock": self.is_mock}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/me",
                    params={"access_token": self.access_token, "fields": "id,name"},
                )
                if response.status_code == 200:
                    data = response.json()
                    return {"valid": True, "user_id": data.get("id"), "user_name": data.get("name")}
                else:
                    error_data = response.json() if response.text else {}
                    parsed = parse_meta_error(error_data, response.status_code)
                    return {"valid": False, "error_code": parsed["error_code"], "message": parsed["user_message"], "is_token_expired": parsed["is_token_expired"]}
        except Exception as e:
            return {"valid": False, "message": f"Erro de conexao: {str(e)}"}

    def suggest_targeting(self, product_name: str, target_audience: str, price: float) -> Dict:
        """AI-like targeting suggestions based on product data."""
        age_min, age_max = 25, 55
        if "18" in target_audience: age_min = 18
        if "25" in target_audience: age_min = 25
        if "35" in target_audience: age_min = 35
        if "45" in target_audience: age_max = 45
        if "55" in target_audience: age_max = 55
        if "65" in target_audience: age_max = 65

        interests_map = {
            "excel": ["Microsoft Office", "Business software", "Data analysis", "Productivity"],
            "marketing": ["Digital marketing", "Social media marketing", "Entrepreneurship"],
            "programa": ["Software development", "Computer programming", "Technology"],
            "curso": ["Online education", "E-learning", "Professional development"],
            "fitness": ["Physical fitness", "Gym", "Healthy lifestyle", "Weight training"],
            "comida": ["Food & restaurants", "Cooking", "Gastronomy"],
            "default": ["Entrepreneurship", "Online shopping", "Small business"],
        }

        product_lower = product_name.lower()
        interests = interests_map.get("default")
        for key, vals in interests_map.items():
            if key in product_lower:
                interests = vals
                break

        strategy = f"""Estrategia de Targeting Inteligente:
- Publico: {target_audience}
- Faixa etaria: {age_min}-{age_max} anos
- Interesses: {', '.join(interests)}
- Posicionamento: Feed do Facebook, Stories do Facebook, Feed do Instagram, Stories do Instagram, Reels do Instagram, Explorar do Instagram
- Otimizacao: Conversoes (compra/cadastro)
- Orcamento sugerido: R${max(price * 0.1, 20):.2f}/dia
- Lookalike: Ativar apos 100 conversoes iniciais"""

        return {
            "age_min": age_min,
            "age_max": age_max,
            "genders": [0],
            "interests": interests,
            "locations": [{"country": "BR"}],
            "placements": ["facebook_feed", "facebook_stories", "instagram_feed", "instagram_stories", "instagram_reels", "instagram_explore"],
            "optimization_goal": "CONVERSIONS",
            "suggested_daily_budget": max(price * 0.1, 20),
            "strategy": strategy,
        }

    async def create_campaign(self, name: str, objective: str = "OUTCOME_TRAFFIC") -> Dict:
        """Create a campaign on Meta Ads."""
        if self.is_mock:
            return {
                "id": f"mock_campaign_{random.randint(10000, 99999)}",
                "status": "ACTIVE",
                "is_mock": True,
            }

        try:
            response = await self._request_with_retry(
                "POST",
                f"{self.base_url}/{self.ad_account_id}/campaigns",
                data={
                    "access_token": self.access_token,
                    "name": name,
                    "objective": objective,
                    "status": "PAUSED",
                    "special_ad_categories": "[]",
                    "is_adset_budget_sharing_enabled": "false",
                },
            )
            if response.status_code == 200:
                data = response.json()
                data["is_mock"] = False
                return data
            else:
                error_data = response.json() if response.text else {}
                parsed = parse_meta_error(error_data, response.status_code)
                return {"id": None, "status": "ERROR", "is_mock": False, "error": parsed["user_message"], "error_code": parsed["error_code"], "is_token_expired": parsed.get("is_token_expired", False)}
        except Exception as e:
            return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro de conexao com Meta Ads: {str(e)}"}

    async def create_adset(
        self, campaign_id: str, name: str, targeting: Dict, daily_budget: float,
        promoted_object: Dict = None
    ) -> Dict:
        """Create Ad Set with targeting and budget."""
        if self.is_mock:
            return {"id": f"mock_adset_{random.randint(10000, 99999)}", "status": "PAUSED", "is_mock": True}

        try:
            # Budget in cents (BRL centavos)
            budget_cents = int(daily_budget * 100)

            # Build targeting spec - use simple geo + age targeting
            # Note: interests with names (not IDs) may be rejected by Meta API
            targeting_spec = {
                "age_min": targeting.get("age_min", 25),
                "age_max": targeting.get("age_max", 55),
                "geo_locations": {"countries": ["BR"]},
                "targeting_automation": {"advantage_audience": 0},
            }
            # Only add genders if specified (0 = all)
            genders = targeting.get("genders", [0])
            if genders and genders != [0]:
                targeting_spec["genders"] = genders

            # Determine optimization goal based on promoted_object
            optimization_goal = "LINK_CLICKS"
            if promoted_object:
                optimization_goal = "OFFSITE_CONVERSIONS"

            adset_data = {
                "access_token": self.access_token,
                "name": name,
                "campaign_id": campaign_id,
                "daily_budget": str(budget_cents),
                "billing_event": "IMPRESSIONS",
                "optimization_goal": optimization_goal,
                "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
                "destination_type": "WEBSITE",
                "targeting": json.dumps(targeting_spec),
                "status": "PAUSED",
            }

            # Add promoted_object for conversion tracking with pixel
            if promoted_object:
                adset_data["promoted_object"] = json.dumps(promoted_object)

            response = await self._request_with_retry(
                "POST",
                f"{self.base_url}/{self.ad_account_id}/adsets",
                data=adset_data,
            )
            if response.status_code == 200:
                data = response.json()
                data["is_mock"] = False
                return data
            else:
                error_data = response.json() if response.text else {}
                logger.error("Meta API error creating adset: %s", error_data)
                parsed = parse_meta_error(error_data, response.status_code)
                return {"id": None, "status": "ERROR", "is_mock": False, "error": parsed["user_message"], "error_code": parsed["error_code"], "is_token_expired": parsed.get("is_token_expired", False)}
        except Exception as e:
            return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro ao criar Ad Set: {str(e)}"}

    async def create_ad_creative(
        self, name: str, message: str, headline: str, image_url: str = "",
        link: str = "https://example.com", cta_type: str = "LEARN_MORE",
        image_hash: str = ""
    ) -> Dict:
        """Create Ad Creative with image, text, and CTA."""
        if self.is_mock:
            return {"id": f"mock_creative_{random.randint(10000, 99999)}", "is_mock": True}

        if not self.page_id:
            return {"id": None, "error": "Facebook Page ID nao configurado. Reconecte sua conta Meta nas Configuracoes."}

        # Allow creation without image — Meta will use text-only creative
        if not image_url and not image_hash:
            logger.info("Creating ad creative without image (text-only)")

        try:
            # Map CTA text to Meta API CTA type
            cta_map = {
                "saiba mais": "LEARN_MORE",
                "comprar": "SHOP_NOW",
                "compre agora": "SHOP_NOW",
                "cadastre-se": "SIGN_UP",
                "inscreva-se": "SIGN_UP",
                "baixar": "DOWNLOAD",
                "assinar": "SUBSCRIBE",
                "contato": "CONTACT_US",
            }
            cta_lower = cta_type.lower() if cta_type else ""
            resolved_cta = cta_map.get(cta_lower, "LEARN_MORE")
            # If the cta_type is already a valid Meta CTA constant, use it directly
            valid_ctas = ["LEARN_MORE", "SHOP_NOW", "SIGN_UP", "DOWNLOAD", "SUBSCRIBE", "CONTACT_US", "APPLY_NOW", "GET_QUOTE", "BOOK_TRAVEL", "WATCH_MORE"]
            if cta_type and cta_type.upper() in valid_ctas:
                resolved_cta = cta_type.upper()

            link_data = {
                "message": message,
                "link": link,
                "name": headline,
                "call_to_action": {
                    "type": resolved_cta,
                    "value": {"link": link},
                },
            }
            # Meta API v22+ requires image_hash; image_url is no longer accepted in link_data
            if image_hash:
                link_data["image_hash"] = image_hash
            elif image_url and image_url.startswith("http"):
                # Only use image_url for external URLs, upload local images first
                link_data["image_hash"] = await self._upload_url_to_hash(image_url)
                if not link_data["image_hash"]:
                    return {"id": None, "error": "Falha ao processar imagem. Tente regenerar o criativo."}

            object_story_spec = {
                "page_id": self.page_id,
                "link_data": link_data,
            }

            response = await self._request_with_retry(
                "POST",
                f"{self.base_url}/{self.ad_account_id}/adcreatives",
                data={
                    "access_token": self.access_token,
                    "name": name,
                    "object_story_spec": json.dumps(object_story_spec),
                },
            )
            if response.status_code == 200:
                data = response.json()
                data["is_mock"] = False
                return data
            else:
                error_data = response.json() if response.text else {}
                parsed = parse_meta_error(error_data, response.status_code)
                return {"id": None, "is_mock": False, "error": parsed["user_message"], "error_code": parsed["error_code"], "is_token_expired": parsed.get("is_token_expired", False)}
        except Exception as e:
            return {"id": None, "is_mock": False, "error": f"Erro ao criar Ad Creative: {str(e)}"}

    async def create_ad(self, adset_id: str, creative_id: str, name: str,
                        tracking_specs: str = None, url_tags: str = None) -> Dict:
        """Create Ad linking creative to ad set."""
        if self.is_mock:
            return {"id": f"mock_ad_{random.randint(10000, 99999)}", "status": "PAUSED", "is_mock": True}

        try:
            ad_data = {
                "access_token": self.access_token,
                "name": name,
                "adset_id": adset_id,
                "creative": json.dumps({"creative_id": creative_id}),
                "status": "PAUSED",
            }

            # Add tracking_specs for pixel conversion tracking
            if tracking_specs:
                ad_data["tracking_specs"] = tracking_specs

            # Add UTM url_tags for attribution
            if url_tags:
                ad_data["url_tags"] = url_tags

            response = await self._request_with_retry(
                "POST",
                f"{self.base_url}/{self.ad_account_id}/ads",
                data=ad_data,
            )
            if response.status_code == 200:
                data = response.json()
                data["is_mock"] = False
                return data
            else:
                error_data = response.json() if response.text else {}
                logger.error("Meta API error creating ad: %s", error_data)
                parsed = parse_meta_error(error_data, response.status_code)
                return {"id": None, "status": "ERROR", "is_mock": False, "error": parsed["user_message"], "error_code": parsed["error_code"], "is_token_expired": parsed.get("is_token_expired", False)}
        except Exception as e:
            return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro ao criar Ad: {str(e)}"}

    async def create_full_campaign(
        self, campaign_name: str, targeting: Dict, daily_budget: float,
        ad_message: str, ad_headline: str, ad_image_url: str,
        ad_cta: str = "LEARN_MORE", ad_link: str = "https://example.com",
        pixel_id: str = "", objective: str = "OUTCOME_TRAFFIC",
        optimization_goal: str = "LINK_CLICKS", event_type: str = "PURCHASE"
    ) -> Dict:
        """Create complete campaign: Campaign + Ad Set + Ad Creative + Ad.
        Returns dict with all IDs and any errors.

        Args:
            pixel_id: Meta Pixel ID for conversion tracking
            objective: Campaign objective (OUTCOME_TRAFFIC, OUTCOME_SALES, OUTCOME_LEADS)
            optimization_goal: Ad set optimization goal
            event_type: Custom event type for promoted_object (e.g. PURCHASE)
        """
        result = {
            "campaign_id": None,
            "adset_id": None,
            "creative_id": None,
            "ad_id": None,
            "is_mock": self.is_mock,
            "errors": [],
        }

        # Build pixel-related objects
        promoted_object = self._build_promoted_object(pixel_id, event_type) if pixel_id else None
        tracking_specs = self._build_tracking_specs(pixel_id) if pixel_id else None
        url_tags = self._build_url_tags(campaign_name)

        # Step 1: Create Campaign
        campaign = await self.create_campaign(campaign_name, objective=objective)
        if campaign.get("status") == "ERROR":
            result["errors"].append(campaign.get("error", "Erro ao criar campanha"))
            return result
        result["campaign_id"] = campaign.get("id")
        result["is_mock"] = campaign.get("is_mock", True)

        if self.is_mock:
            result["adset_id"] = f"mock_adset_{random.randint(10000, 99999)}"
            result["creative_id"] = f"mock_creative_{random.randint(10000, 99999)}"
            result["ad_id"] = f"mock_ad_{random.randint(10000, 99999)}"
            return result

        # Step 2: Create Ad Set (with promoted_object if pixel provided)
        adset = await self.create_adset(
            campaign_id=result["campaign_id"],
            name=f"AdSet - {campaign_name}",
            targeting=targeting,
            daily_budget=daily_budget,
            promoted_object=promoted_object,
        )
        if adset.get("error"):
            result["errors"].append(adset["error"])
            return result
        result["adset_id"] = adset.get("id")

        # Step 3: Handle image - upload local images to Meta first
        image_hash = ""
        if ad_image_url and ad_image_url.startswith("/uploads/"):
            # Local image - need to upload to Meta
            from pathlib import Path
            _data_dir = Path("/app/data") if Path("/app/data").exists() else Path(__file__).parent.parent.parent
            local_path = _data_dir / ad_image_url.lstrip("/")
            if local_path.exists():
                image_bytes = local_path.read_bytes()
                upload_result = await self.upload_image(image_bytes, local_path.name)
                if upload_result.get("image_hash"):
                    image_hash = upload_result["image_hash"]
                else:
                    result["errors"].append(upload_result.get("error", "Falha no upload da imagem para o Meta"))
            else:
                # Local file not found (e.g. Render ephemeral filesystem) — try downloading via public URL
                logger.warning("Local image file not found: %s — attempting download via public URL", ad_image_url)
                backend_url = os.environ.get("BACKEND_URL") or os.environ.get("RENDER_EXTERNAL_URL", "http://localhost:8000")
                public_image_url = f"{backend_url.rstrip('/')}{ad_image_url}"
                try:
                    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                        dl_resp = await client.get(public_image_url)
                        if dl_resp.status_code == 200 and len(dl_resp.content) > 1000:
                            filename = ad_image_url.split("/")[-1] or "ad_image.jpg"
                            upload_result = await self.upload_image(dl_resp.content, filename)
                            if upload_result.get("image_hash"):
                                image_hash = upload_result["image_hash"]
                            else:
                                logger.warning("Image downloaded but Meta upload failed: %s", upload_result.get("error"))
                                result.setdefault("warnings", []).append(
                                    f"Imagem encontrada mas falhou upload para Meta: {upload_result.get('error', 'erro desconhecido')}. Campanha criada sem imagem."
                                )
                        else:
                            logger.warning("Failed to download image from %s (status=%s, size=%s)", public_image_url, dl_resp.status_code, len(dl_resp.content) if dl_resp.status_code == 200 else "N/A")
                            result.setdefault("warnings", []).append(
                                f"Imagem nao disponivel ({ad_image_url}). Campanha criada sem imagem."
                            )
                except Exception as e:
                    logger.warning("Exception downloading image from %s: %s", public_image_url, e)
                    result.setdefault("warnings", []).append(
                        f"Erro ao baixar imagem ({ad_image_url}): {e}. Campanha criada sem imagem."
                    )

        # Step 4: Create Ad Creative (proceeds even without image)
        creative_image_url = ad_image_url if (not image_hash and ad_image_url and ad_image_url.startswith("http")) else ""
        creative = await self.create_ad_creative(
            name=f"Creative - {campaign_name}",
            message=ad_message,
            headline=ad_headline,
            image_url=creative_image_url,
            link=ad_link,
            cta_type=ad_cta,
            image_hash=image_hash,
        )
        if creative.get("error"):
            result["errors"].append(creative["error"])
            return result
        result["creative_id"] = creative.get("id")

        # Step 5: Create Ad (with tracking_specs and url_tags)
        ad = await self.create_ad(
            adset_id=result["adset_id"],
            creative_id=result["creative_id"],
            name=f"Ad - {campaign_name}",
            tracking_specs=tracking_specs,
            url_tags=url_tags,
        )
        if ad.get("error"):
            result["errors"].append(ad["error"])
            return result
        result["ad_id"] = ad.get("id")

        return result

    def _build_promoted_object(self, pixel_id: str = "", event_type: str = "PURCHASE") -> Optional[Dict]:
        """Build promoted_object for conversion tracking."""
        if not pixel_id:
            return None
        return {"pixel_id": pixel_id, "custom_event_type": event_type}

    def _build_tracking_specs(self, pixel_id: str = "") -> Optional[str]:
        """Build tracking_specs JSON for ad pixel tracking."""
        if not pixel_id:
            return None
        return json.dumps([{"action.type": ["offsite_conversion"], "fb_pixel": [pixel_id]}])

    def _build_url_tags(self, campaign_name: str = "") -> str:
        """Build UTM parameters for ad URLs."""
        safe_name = campaign_name.replace(" ", "-").lower()[:50]
        return f"utm_source=facebook&utm_medium=paid_social&utm_campaign={safe_name}&utm_content={{{{ad.name}}}}"

    async def _upload_url_to_hash(self, image_url: str) -> str:
        """Download image from URL and upload to Meta, returning image_hash."""
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                resp = await client.get(image_url)
                if resp.status_code == 200 and len(resp.content) > 1000:
                    result = await self.upload_image(resp.content, "ad_image.jpg")
                    return result.get("image_hash", "")
        except Exception as e:
            print(f"Failed to download/upload image from URL: {e}")
        return ""

    async def upload_image(self, image_bytes: bytes, filename: str = "ad_image.jpg") -> Dict:
        """Upload image to Meta Ads and return image_hash."""
        if self.is_mock:
            return {"image_hash": "mock_hash_abc123", "is_mock": True}
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/{self.ad_account_id}/adimages",
                    data={"access_token": self.access_token},
                    files={"filename": (filename, image_bytes, "image/jpeg")},
                )
                if response.status_code == 200:
                    data = response.json()
                    images = data.get("images", {})
                    if images:
                        first_image = next(iter(images.values()))
                        return {"image_hash": first_image.get("hash", ""), "is_mock": False}
                    return {"image_hash": "", "error": "Nenhuma imagem retornada pelo Meta"}
                else:
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get("error", {}).get("message", "Erro ao fazer upload da imagem")
                    return {"image_hash": "", "error": error_msg}
        except Exception as e:
            return {"image_hash": "", "error": f"Erro de conexao: {str(e)}"}

    async def get_ad_review_status(self, ad_id: str) -> Dict:
        """Get ad review status and feedback."""
        if self.is_mock or ad_id.startswith("mock_"):
            return {"status": "ACTIVE", "effective_status": "ACTIVE", "review_feedback": None, "is_mock": True}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/{ad_id}",
                    params={
                        "access_token": self.access_token,
                        "fields": "status,effective_status,review_feedback",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    return {
                        "status": data.get("status", "UNKNOWN"),
                        "effective_status": data.get("effective_status", "UNKNOWN"),
                        "review_feedback": data.get("review_feedback"),
                        "is_mock": False,
                    }
                return {"status": "UNKNOWN", "effective_status": "UNKNOWN", "review_feedback": None}
        except Exception:
            return {"status": "UNKNOWN", "effective_status": "UNKNOWN", "review_feedback": None}

    async def check_payment(self) -> Dict:
        """Check if ad account has payment method and sufficient funds."""
        if self.is_mock:
            return {"has_payment": False, "balance": 0, "is_prepaid": False, "is_mock": True}
        try:
            response = await self._request_with_retry(
                "GET",
                f"{self.base_url}/{self.ad_account_id}",
                params={
                    "access_token": self.access_token,
                    "fields": "funding_source,funding_source_details,account_status,currency,name,balance,amount_spent,spend_cap",
                },
            )
            if response.status_code == 200:
                data = response.json()
                has_payment = bool(data.get("funding_source"))

                # Balance is in cents (centavos) — convert to reais
                balance_cents = int(data.get("balance", "0"))
                balance = balance_cents / 100

                # Detect prepaid accounts: funding_source_details.type == 1 means prepaid
                # Type 1 = credit card (postpaid), Type 2 = prepaid/manual
                funding_details = data.get("funding_source_details", {})
                funding_type = funding_details.get("type", 0)
                is_prepaid = funding_type == 2  # Only type 2 is truly prepaid

                # If has payment method, it's sufficient for postpaid accounts
                # For prepaid (type 2), also check balance
                has_sufficient_funds = has_payment if not is_prepaid else (has_payment and balance > 0)

                # Human-readable funding type label
                funding_type_labels = {
                    1: "Cartao de credito (debito automatico)",
                    2: "Pre-pago (adicionar fundos)",
                }
                funding_type_label = funding_type_labels.get(funding_type, "Outro")

                # Amount spent is also in cents — convert to reais
                amount_spent_cents = int(data.get("amount_spent", "0"))
                amount_spent = amount_spent_cents / 100

                return {
                    "has_payment": has_payment,
                    "balance": balance,
                    "is_prepaid": is_prepaid,
                    "has_sufficient_funds": has_sufficient_funds,
                    "account_status": data.get("account_status", 0),
                    "currency": data.get("currency", ""),
                    "account_name": data.get("name", ""),
                    "funding_type_label": funding_type_label,
                    "amount_spent": amount_spent,
                }
            else:
                error_data = response.json() if response.text else {}
                parsed = parse_meta_error(error_data, response.status_code)
                return {"has_payment": False, "balance": 0, "is_prepaid": False, "error": parsed["user_message"], "is_token_expired": parsed.get("is_token_expired", False)}
        except Exception as e:
            return {"has_payment": False, "balance": 0, "is_prepaid": False, "error": str(e)}

    async def activate_campaign(self, campaign_id: str) -> Dict:
        """Activate a campaign on Meta (change status from PAUSED to ACTIVE)."""
        if self.is_mock:
            return {"success": True, "is_mock": True}
        try:
            response = await self._request_with_retry(
                "POST",
                f"{self.base_url}/{campaign_id}",
                data={
                    "access_token": self.access_token,
                    "status": "ACTIVE",
                },
            )
            if response.status_code == 200:
                return {"success": True, "is_mock": False}
            else:
                error_data = response.json() if response.text else {}
                parsed = parse_meta_error(error_data, response.status_code)
                return {"success": False, "error": parsed["user_message"], "error_code": parsed["error_code"], "is_token_expired": parsed.get("is_token_expired", False)}
        except Exception as e:
            return {"success": False, "error": f"Erro de conexao: {str(e)}"}

    async def activate_adset(self, adset_id: str) -> Dict:
        """Activate an ad set on Meta (change status from PAUSED to ACTIVE)."""
        if self.is_mock:
            return {"success": True, "is_mock": True}
        try:
            response = await self._request_with_retry(
                "POST",
                f"{self.base_url}/{adset_id}",
                data={
                    "access_token": self.access_token,
                    "status": "ACTIVE",
                },
            )
            if response.status_code == 200:
                return {"success": True, "is_mock": False}
            else:
                error_data = response.json() if response.text else {}
                parsed = parse_meta_error(error_data, response.status_code)
                return {"success": False, "error": parsed["user_message"], "error_code": parsed["error_code"], "is_token_expired": parsed.get("is_token_expired", False)}
        except Exception as e:
            return {"success": False, "error": f"Erro de conexao: {str(e)}"}

    async def get_metrics(self, campaign_id: str) -> Dict:
        """Get campaign metrics (real or mock)."""
        if self.is_mock:
            impressions = random.randint(1000, 50000)
            clicks = int(impressions * random.uniform(0.01, 0.05))
            leads = int(clicks * random.uniform(0.05, 0.2))
            spent = random.uniform(10, 200)
            return {
                "impressions": impressions,
                "clicks": clicks,
                "leads": leads,
                "conversions": int(leads * random.uniform(0.1, 0.4)),
                "ctr": round(clicks / max(impressions, 1) * 100, 2),
                "cpc": round(spent / max(clicks, 1), 2),
                "cpl": round(spent / max(leads, 1), 2),
                "spent": round(spent, 2),
            }

        # Real: call Meta Ads Insights API
        try:
            response = await self._request_with_retry(
                "GET",
                f"{self.base_url}/{campaign_id}/insights",
                params={
                    "access_token": self.access_token,
                    "fields": "impressions,clicks,spend,ctr,cpc,actions,cost_per_action_type",
                    "date_preset": "maximum",
                },
            )
            if response.status_code == 200:
                data = response.json()
                insights = data.get("data", [])
                if not insights:
                    return {
                        "impressions": 0,
                        "clicks": 0,
                        "leads": 0,
                        "conversions": 0,
                        "ctr": 0.0,
                        "cpc": 0.0,
                        "cpl": 0.0,
                        "spent": 0.0,
                    }

                row = insights[0]
                impressions = int(row.get("impressions", 0))
                clicks = int(row.get("clicks", 0))
                spent = float(row.get("spend", 0))
                ctr = float(row.get("ctr", 0))
                cpc = float(row.get("cpc", 0))

                # Extract conversions and leads from actions
                leads = 0
                conversions = 0
                actions = row.get("actions", [])
                for action in actions:
                    action_type = action.get("action_type", "")
                    value = int(action.get("value", 0))
                    if action_type == "lead":
                        leads += value
                    elif action_type in ("purchase", "complete_registration", "offsite_conversion"):
                        conversions += value

                # Extract cost per lead
                cpl = 0.0
                cost_per_actions = row.get("cost_per_action_type", [])
                for cpa in cost_per_actions:
                    if cpa.get("action_type") == "lead":
                        cpl = float(cpa.get("value", 0))
                        break

                if leads > 0 and cpl == 0:
                    cpl = round(spent / leads, 2)

                return {
                    "impressions": impressions,
                    "clicks": clicks,
                    "leads": leads,
                    "conversions": conversions,
                    "ctr": round(ctr, 2),
                    "cpc": round(cpc, 2),
                    "cpl": round(cpl, 2),
                    "spent": round(spent, 2),
                }
            else:
                error_data = response.json() if response.text else {}
                parsed = parse_meta_error(error_data, response.status_code)
                print(f"Meta Insights API error {response.status_code}: {parsed['user_message']}")
                return {}
        except Exception as e:
            print(f"Error fetching Meta insights: {e}")
            return {}
