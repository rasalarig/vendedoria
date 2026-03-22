import asyncio
import json
import uuid
import os
import base64
from typing import Optional

import httpx

from app.core.config import settings

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
VEO_MODEL = "veo-3.0-generate-001"


class VideoGenerationService:
    """Video generation using Google Veo 3.

    Uses the Gemini API with Veo 3 model for generating video ads.
    """

    PROVIDER_NAME = "Google Veo 3"
    COST_PER_SECOND = 0.05  # estimated
    USD_TO_BRL = 5.5  # approximate conversion

    def __init__(self):
        self.api_key = settings.GOOGLE_AI_KEY

    # ------------------------------------------------------------------
    # Script generation via Together AI LLM
    # ------------------------------------------------------------------

    async def generate_script(
        self,
        seller,
        product,
        style_tags: Optional[list[str]] = None,
        style: Optional[str] = None,
    ) -> str:
        """Use Together AI LLM to generate a short sales video script in PT-BR.

        The script targets 15-30 seconds when read aloud (~50-100 words).
        Structure: hook (first 3s) -> product benefit -> CTA.
        """
        personality = getattr(seller, "personality", "informal") or "informal"
        catchphrases_raw = getattr(seller, "catchphrases", "") or ""
        language_style = getattr(seller, "language_style", "") or ""
        seller_name = getattr(seller, "name", "Vendedor") or "Vendedor"

        product_name = getattr(product, "name", "") or ""
        product_desc = getattr(product, "description", "") or ""
        product_price = getattr(product, "price", 0) or 0
        target_audience = getattr(product, "target_audience", "") or ""
        differentials = getattr(product, "differentials", "") or ""
        pricing_type = getattr(product, "pricing_type", "one_time") or "one_time"

        price_display = f"R$ {product_price:.2f}"
        if pricing_type == "monthly":
            price_display += "/mes"
        elif pricing_type == "yearly":
            price_display += "/ano"

        style_hint = ""
        if style_tags:
            style_hint = f"\nESTILO DO VIDEO: {', '.join(style_tags)}"

        prompt = f"""Voce e um roteirista profissional de video ads para redes sociais (Instagram Reels, TikTok, YouTube Shorts).

Crie um roteiro CURTO de video publicitario em portugues brasileiro para ser narrado por um vendedor virtual.

DADOS DO VENDEDOR:
- Nome: {seller_name}
- Personalidade: {personality}
- Estilo de linguagem: {language_style}
- Bordoes favoritos: {catchphrases_raw}

DADOS DO PRODUTO:
- Nome: {product_name}
- Descricao: {product_desc}
- Preco: {price_display}
- Tipo: {pricing_type}
- Publico-alvo: {target_audience}
- Diferenciais: {differentials}
{style_hint}

REGRAS DO ROTEIRO:
1. Deve ter entre 50 e 100 palavras (15-30 segundos de fala)
2. Comecar com um GANCHO forte nos primeiros 3 segundos (pergunta provocativa, dado chocante, ou frase de impacto)
3. Apresentar o beneficio principal do produto (nao apenas features)
4. Incluir prova social ou gatilho de urgencia/escassez
5. Terminar com CTA claro e direto
6. Usar o tom de voz do vendedor ({personality})
7. Se o vendedor tem bordoes, use pelo menos um naturalmente
8. Texto deve soar NATURAL quando falado, nao como texto escrito

Retorne APENAS o texto do roteiro, sem marcacoes, sem titulos, sem instrucoes de cena. Apenas o texto que sera falado."""

        # Try Together AI LLM
        api_key = settings.TOGETHER_API_KEY
        if api_key:
            try:
                script = await self._call_together_llm(prompt, api_key)
                if script:
                    return script.strip()
            except Exception as e:
                print(f"Together AI LLM error: {e}")

        # Fallback: generate a template-based script
        return self._fallback_script(seller_name, personality, product_name, product_desc, price_display, target_audience, differentials, catchphrases_raw)

    async def refine_script(
        self,
        current_script: str,
        instruction: str,
        product,
        style: Optional[str] = None,
    ) -> str:
        """Refine an existing script based on user instructions."""
        product_name = getattr(product, "name", "") or ""
        product_desc = getattr(product, "description", "") or ""
        style_hint = f"\nESTILO/TOM DESEJADO: {style}" if style else ""

        prompt = f"""Voce e um roteirista profissional de video ads para redes sociais.

ROTEIRO ATUAL:
{current_script}

PRODUTO: {product_name} - {product_desc}
{style_hint}

INSTRUCAO DO USUARIO: {instruction}

Aplique a instrucao do usuario ao roteiro atual. Mantenha o formato de roteiro para video ad (50-100 palavras, gancho forte, CTA).
Retorne APENAS o texto do roteiro atualizado, sem explicacoes ou comentarios."""

        api_key = settings.TOGETHER_API_KEY
        if api_key:
            try:
                result = await self._call_together_llm(prompt, api_key)
                if result:
                    return result.strip()
            except Exception as e:
                print(f"Together AI refine error: {e}")

        return current_script  # fallback: return unchanged

    async def _call_together_llm(self, prompt: str, api_key: str) -> Optional[str]:
        """Call Together AI chat completion endpoint."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.together.xyz/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
                    "messages": [
                        {
                            "role": "system",
                            "content": "Voce e um roteirista brasileiro especialista em video ads curtos para redes sociais. Responda apenas com o roteiro solicitado, sem formatacao extra.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 500,
                    "temperature": 0.8,
                },
            )
            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"Together AI LLM error {response.status_code}: {response.text[:300]}")
                return None

    def _fallback_script(
        self,
        seller_name: str,
        personality: str,
        product_name: str,
        product_desc: str,
        price_display: str,
        target_audience: str,
        differentials: str,
        catchphrases: str,
    ) -> str:
        """Generate a template-based script when the LLM is unavailable."""
        catchphrase = ""
        if catchphrases:
            try:
                parsed = json.loads(catchphrases)
                if isinstance(parsed, list) and parsed:
                    catchphrase = parsed[0]
            except (json.JSONDecodeError, IndexError):
                pass

        hook = f"Ei, voce que {f'e {target_audience}' if target_audience else 'quer resultados de verdade'}!"
        benefit = product_desc[:120] if product_desc else f"o melhor {product_name} do mercado"
        diff_text = differentials[:100] if differentials else "qualidade comprovada"
        cta = f"Garanta o seu {product_name} agora por apenas {price_display}!"
        catchphrase_line = f" {catchphrase}" if catchphrase else ""

        return (
            f"{hook} "
            f"Eu sou o {seller_name} e preciso te contar uma coisa.{catchphrase_line} "
            f"Apresento pra voce o {product_name}: {benefit}. "
            f"Com {diff_text}, voce vai ver a diferenca no primeiro dia. "
            f"Milhares de pessoas ja transformaram seus resultados. "
            f"{cta} Corre que as vagas sao limitadas!"
        )

    # ------------------------------------------------------------------
    # Cost estimation
    # ------------------------------------------------------------------

    async def estimate_cost(self, duration_seconds: float = 10) -> dict:
        """Return cost estimate for Veo 3 video generation."""
        cost = self.COST_PER_SECOND * duration_seconds
        return {
            "provider": "veo3",
            "provider_name": self.PROVIDER_NAME,
            "duration_seconds": duration_seconds,
            "estimated_cost_usd": round(cost, 3),
            "estimated_cost_brl": round(cost * self.USD_TO_BRL, 2),
        }

    # ------------------------------------------------------------------
    # Video generation with Veo 3
    # ------------------------------------------------------------------

    async def generate_video(
        self,
        script: str,
        seller,
        product,
        duration_seconds: float = 10,
        reference_video_path: Optional[str] = None,
    ) -> dict:
        """Generate a video ad using Google Veo 3."""
        task_id = str(uuid.uuid4())

        if not self.api_key:
            raise Exception("GOOGLE_AI_KEY nao configurada. Configure nas variaveis de ambiente.")

        try:
            result = await self._generate_veo3(task_id, script, seller, product, duration_seconds)
            return result
        except Exception as e:
            raise Exception(f"Erro na geracao de video Veo 3: {str(e)}")

    async def _generate_veo3(self, task_id, script, seller, product, duration) -> dict:
        """Call Google Veo 3 API with correct async format."""
        seller_name = getattr(seller, 'name', 'Apresentador') or 'Apresentador'
        product_name = getattr(product, 'name', 'Produto') or 'Produto'
        product_desc = getattr(product, 'description', '') or ''

        prompt = (
            f"Create a professional Brazilian Portuguese sales video ad. "
            f"A charismatic presenter named {seller_name} speaks directly to camera, "
            f"presenting the product '{product_name}': {product_desc[:200]}. "
            f"The script to be narrated: {script[:1000]}. "
            f"Style: modern, engaging social media ad for Instagram Reels/TikTok. "
            f"Well-lit, professional setting, confident body language."
        )

        # Build request instance
        instance: dict = {"prompt": prompt}

        # Try to load actor photo if available
        actor_photo_bytes = await self._load_actor_photo(seller)
        if actor_photo_bytes:
            instance["image"] = {
                "bytesBase64Encoded": base64.b64encode(actor_photo_bytes).decode("utf-8"),
                "mimeType": "image/png",
            }

        payload = {
            "instances": [instance],
            "parameters": {
                "aspectRatio": "9:16",
                "durationSeconds": min(int(duration), 8),
                "sampleCount": 1,
            },
        }

        headers = {
            "x-goog-api-key": self.api_key,
            "Content-Type": "application/json",
        }

        # Step 1: Start generation
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{BASE_URL}/models/{VEO_MODEL}:predictLongRunning",
                headers=headers,
                json=payload,
            )

            if response.status_code != 200:
                error_msg = response.json().get("error", {}).get("message", response.text[:300])
                if response.status_code == 429:
                    raise Exception(f"Quota do Google AI excedida. Aguarde alguns minutos ou verifique seu plano em https://ai.google.dev. Detalhes: {error_msg}")
                raise Exception(f"Erro ao iniciar geracao (HTTP {response.status_code}): {error_msg}")

            operation_name = response.json().get("name")
            if not operation_name:
                raise Exception("Veo 3 nao retornou ID da operacao. Resposta inesperada da API.")

        # Step 2: Poll for completion (36 * 10s = 360s max)
        async with httpx.AsyncClient(timeout=30.0) as client:
            for _ in range(36):
                await asyncio.sleep(10)
                poll_resp = await client.get(
                    f"{BASE_URL}/{operation_name}",
                    headers={"x-goog-api-key": self.api_key},
                )
                if poll_resp.status_code != 200:
                    print(f"Veo 3 poll error {poll_resp.status_code}: {poll_resp.text[:200]}")
                    continue

                poll_data = poll_resp.json()
                if poll_data.get("done"):
                    # Extract video URI
                    try:
                        video_uri = poll_data["response"]["generateVideoResponse"]["generatedSamples"][0]["video"]["uri"]
                    except (KeyError, IndexError):
                        raise Exception(f"Resposta inesperada do Veo 3: {json.dumps(poll_data)[:300]}")

                    # Step 3: Download video
                    async with httpx.AsyncClient(timeout=120.0, follow_redirects=True) as dl_client:
                        video_resp = await dl_client.get(
                            video_uri,
                            headers={"x-goog-api-key": self.api_key},
                        )
                        if video_resp.status_code == 200:
                            video_bytes = video_resp.content
                            # Save to disk
                            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                            data_dir = "/app/data" if os.path.exists("/app/data") else backend_dir
                            video_dir = os.path.join(data_dir, "uploads", "videos", "generated")
                            os.makedirs(video_dir, exist_ok=True)
                            filename = f"veo3_{task_id}.mp4"
                            filepath = os.path.join(video_dir, filename)
                            with open(filepath, "wb") as f:
                                f.write(video_bytes)

                            cost = self.COST_PER_SECOND * duration
                            return {
                                "task_id": task_id,
                                "status": "completed",
                                "provider": "veo3",
                                "provider_name": self.PROVIDER_NAME,
                                "filename": filename,
                                "file_path": f"/uploads/videos/generated/{filename}",
                                "file_size": len(video_bytes),
                                "duration_seconds": duration,
                                "cost_usd": round(cost, 3),
                                "cost_brl": round(cost * self.USD_TO_BRL, 2),
                                "mock": False,
                            }
                        else:
                            raise Exception(f"Erro ao baixar o video gerado (HTTP {video_resp.status_code})")

        raise Exception("Tempo limite excedido (6 min). O video pode ainda estar sendo gerado. Tente novamente em alguns minutos.")

    async def _load_actor_photo(self, seller) -> Optional[bytes]:
        """Try to load actor face photo from the faces catalog."""
        face_url = getattr(seller, 'face_url', None) or getattr(seller, 'thumbnail_url', None)
        if not face_url:
            return None

        # If it's a local path
        if face_url.startswith('/'):
            backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            data_dir = "/app/data" if os.path.exists("/app/data") else backend_dir
            local_path = os.path.join(data_dir, face_url.lstrip('/'))
            if os.path.exists(local_path):
                with open(local_path, 'rb') as f:
                    return f.read()

        # If it's a URL, download it
        if face_url.startswith('http'):
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(face_url)
                    if resp.status_code == 200:
                        return resp.content
            except Exception as e:
                print(f"Failed to download actor photo: {e}")

        return None

    def _mock_result(self, task_id: str, duration_seconds: float) -> dict:
        """Return a mock result when the real API is unavailable."""
        cost = self.COST_PER_SECOND * duration_seconds
        return {
            "task_id": task_id,
            "status": "ready",
            "provider": "veo3",
            "provider_name": self.PROVIDER_NAME,
            "duration_seconds": duration_seconds,
            "cost_usd": round(cost, 4),
            "filename": f"mock_veo3_{task_id[:8]}.mp4",
            "mock": True,
        }

    # ------------------------------------------------------------------
    # Status check
    # ------------------------------------------------------------------

    async def check_status(self, task_id: str) -> dict:
        """Check video generation status."""
        return {
            "task_id": task_id,
            "status": "ready",
            "provider": "veo3",
            "progress": 100,
            "mock": True,
        }
