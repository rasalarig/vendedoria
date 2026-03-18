import httpx
import json
import random
from typing import Dict, Optional


class MetaAdsService:
    def __init__(self, access_token: str = "", ad_account_id: str = "", page_id: str = ""):
        self.access_token = access_token
        # Normalize ad_account_id to always include act_ prefix required by Meta API
        if ad_account_id and not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        self.ad_account_id = ad_account_id
        self.page_id = page_id
        self.base_url = "https://graph.facebook.com/v18.0"
        self.is_mock = not (access_token and ad_account_id)

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

    async def create_campaign(self, name: str) -> Dict:
        """Create a campaign on Meta Ads."""
        if self.is_mock:
            return {
                "id": f"mock_campaign_{random.randint(10000, 99999)}",
                "status": "ACTIVE",
                "is_mock": True,
            }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/{self.ad_account_id}/campaigns",
                    data={
                        "access_token": self.access_token,
                        "name": name,
                        "objective": "OUTCOME_TRAFFIC",
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
                    error_obj = error_data.get("error", {})
                    error_msg = error_obj.get("error_user_msg") or error_obj.get("message", response.text[:200])
                    return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro Meta Ads ({response.status_code}): {error_msg}"}
        except Exception as e:
            return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro de conexao com Meta Ads: {str(e)}"}

    async def create_adset(
        self, campaign_id: str, name: str, targeting: Dict, daily_budget: float
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
            }
            # Only add genders if specified (0 = all)
            genders = targeting.get("genders", [0])
            if genders and genders != [0]:
                targeting_spec["genders"] = genders

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/{self.ad_account_id}/adsets",
                    data={
                        "access_token": self.access_token,
                        "name": name,
                        "campaign_id": campaign_id,
                        "daily_budget": str(budget_cents),
                        "billing_event": "IMPRESSIONS",
                        "optimization_goal": "LINK_CLICKS",
                        "bid_strategy": "LOWEST_COST_WITHOUT_CAP",
                        "destination_type": "WEBSITE",
                        "targeting": json.dumps(targeting_spec),
                        "status": "PAUSED",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    data["is_mock"] = False
                    return data
                else:
                    error_data = response.json() if response.text else {}
                    error_obj = error_data.get("error", {})
                    error_msg = error_obj.get("error_user_msg") or error_obj.get("message", response.text[:200])
                    return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro Ad Set ({response.status_code}): {error_msg}"}
        except Exception as e:
            return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro ao criar Ad Set: {str(e)}"}

    async def create_ad_creative(
        self, name: str, message: str, headline: str, image_url: str,
        link: str = "https://example.com", cta_type: str = "LEARN_MORE"
    ) -> Dict:
        """Create Ad Creative with image, text, and CTA."""
        if self.is_mock:
            return {"id": f"mock_creative_{random.randint(10000, 99999)}", "is_mock": True}

        if not self.page_id:
            return {"id": None, "error": "Facebook Page ID nao configurado. Reconecte sua conta Meta nas Configuracoes."}

        if not image_url:
            return {"id": None, "error": "Imagem do anuncio nao disponivel. Gere um criativo com imagem antes de criar a campanha."}

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

            object_story_spec = {
                "page_id": self.page_id,
                "link_data": {
                    "message": message,
                    "link": link,
                    "name": headline,
                    "image_url": image_url,
                    "call_to_action": {
                        "type": resolved_cta,
                        "value": {"link": link},
                    },
                },
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
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
                    error_obj = error_data.get("error", {})
                    error_msg = error_obj.get("error_user_msg") or error_obj.get("message", response.text[:200])
                    return {"id": None, "is_mock": False, "error": f"Erro Ad Creative ({response.status_code}): {error_msg}"}
        except Exception as e:
            return {"id": None, "is_mock": False, "error": f"Erro ao criar Ad Creative: {str(e)}"}

    async def create_ad(self, adset_id: str, creative_id: str, name: str) -> Dict:
        """Create Ad linking creative to ad set."""
        if self.is_mock:
            return {"id": f"mock_ad_{random.randint(10000, 99999)}", "status": "PAUSED", "is_mock": True}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/{self.ad_account_id}/ads",
                    data={
                        "access_token": self.access_token,
                        "name": name,
                        "adset_id": adset_id,
                        "creative": json.dumps({"creative_id": creative_id}),
                        "status": "PAUSED",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    data["is_mock"] = False
                    return data
                else:
                    error_data = response.json() if response.text else {}
                    error_obj = error_data.get("error", {})
                    error_msg = error_obj.get("error_user_msg") or error_obj.get("message", response.text[:200])
                    return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro Ad ({response.status_code}): {error_msg}"}
        except Exception as e:
            return {"id": None, "status": "ERROR", "is_mock": False, "error": f"Erro ao criar Ad: {str(e)}"}

    async def create_full_campaign(
        self, campaign_name: str, targeting: Dict, daily_budget: float,
        ad_message: str, ad_headline: str, ad_image_url: str,
        ad_cta: str = "LEARN_MORE", ad_link: str = "https://example.com"
    ) -> Dict:
        """Create complete campaign: Campaign + Ad Set + Ad Creative + Ad.
        Returns dict with all IDs and any errors."""
        result = {
            "campaign_id": None,
            "adset_id": None,
            "creative_id": None,
            "ad_id": None,
            "is_mock": self.is_mock,
            "errors": [],
        }

        # Step 1: Create Campaign
        campaign = await self.create_campaign(campaign_name)
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

        # Step 2: Create Ad Set
        adset = await self.create_adset(
            campaign_id=result["campaign_id"],
            name=f"AdSet - {campaign_name}",
            targeting=targeting,
            daily_budget=daily_budget,
        )
        if adset.get("error"):
            result["errors"].append(adset["error"])
            return result
        result["adset_id"] = adset.get("id")

        # Step 3: Create Ad Creative
        creative = await self.create_ad_creative(
            name=f"Creative - {campaign_name}",
            message=ad_message,
            headline=ad_headline,
            image_url=ad_image_url,
            link=ad_link,
            cta_type=ad_cta,
        )
        if creative.get("error"):
            result["errors"].append(creative["error"])
            return result
        result["creative_id"] = creative.get("id")

        # Step 4: Create Ad
        ad = await self.create_ad(
            adset_id=result["adset_id"],
            creative_id=result["creative_id"],
            name=f"Ad - {campaign_name}",
        )
        if ad.get("error"):
            result["errors"].append(ad["error"])
            return result
        result["ad_id"] = ad.get("id")

        return result

    async def check_payment(self) -> Dict:
        """Check if ad account has payment method configured."""
        if self.is_mock:
            return {"has_payment": False, "is_mock": True}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/{self.ad_account_id}",
                    params={
                        "access_token": self.access_token,
                        "fields": "funding_source,account_status,currency,name",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    has_payment = bool(data.get("funding_source"))
                    return {
                        "has_payment": has_payment,
                        "account_status": data.get("account_status", 0),
                        "currency": data.get("currency", ""),
                        "account_name": data.get("name", ""),
                    }
                return {"has_payment": False, "error": f"Erro ao verificar conta: {response.status_code}"}
        except Exception as e:
            return {"has_payment": False, "error": str(e)}

    async def activate_campaign(self, campaign_id: str) -> Dict:
        """Activate a campaign on Meta (change status from PAUSED to ACTIVE)."""
        if self.is_mock:
            return {"success": True, "is_mock": True}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
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
                    error_obj = error_data.get("error", {})
                    error_msg = error_obj.get("error_user_msg") or error_obj.get("message", response.text[:200])
                    return {"success": False, "error": f"Erro ao ativar campanha ({response.status_code}): {error_msg}"}
        except Exception as e:
            return {"success": False, "error": f"Erro de conexao: {str(e)}"}

    async def activate_adset(self, adset_id: str) -> Dict:
        """Activate an ad set on Meta (change status from PAUSED to ACTIVE)."""
        if self.is_mock:
            return {"success": True, "is_mock": True}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
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
                    error_obj = error_data.get("error", {})
                    error_msg = error_obj.get("error_user_msg") or error_obj.get("message", response.text[:200])
                    return {"success": False, "error": f"Erro ao ativar conjunto de anuncios ({response.status_code}): {error_msg}"}
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
        # Real: call insights API
        return {}
