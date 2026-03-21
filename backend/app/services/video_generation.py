import json
import uuid
from typing import Optional

import httpx

from app.core.config import settings


class VideoGenerationService:
    """Multi-provider video generation engine.

    Supports Hailuo MiniMax, Runway Gen-4, and HeyGen providers.
    Currently operates in mock mode; real API calls are wired when
    the user provides API keys.
    """

    PROVIDERS = {
        "hailuo": {"name": "Hailuo MiniMax", "cost_per_second": 0.084},
        "runway": {"name": "Runway Gen-4", "cost_per_second": 0.05},
        "heygen": {"name": "HeyGen", "cost_per_second": 0.10},
    }

    USD_TO_BRL = 5.5  # approximate conversion

    def __init__(self, provider: str = "hailuo"):
        if provider not in self.PROVIDERS:
            raise ValueError(f"Provider desconhecido: {provider}. Escolha entre: {list(self.PROVIDERS.keys())}")
        self.provider = provider

    # ------------------------------------------------------------------
    # Script generation via Together AI LLM
    # ------------------------------------------------------------------

    async def generate_script(
        self,
        seller,
        product,
        style_tags: Optional[list[str]] = None,
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
        """Return cost estimate for video generation."""
        provider_info = self.PROVIDERS[self.provider]
        cost = provider_info["cost_per_second"] * duration_seconds
        return {
            "provider": self.provider,
            "provider_name": provider_info["name"],
            "duration_seconds": duration_seconds,
            "estimated_cost_usd": round(cost, 3),
            "estimated_cost_brl": round(cost * self.USD_TO_BRL, 2),
        }

    # ------------------------------------------------------------------
    # Video generation (mock for now, structured for real providers)
    # ------------------------------------------------------------------

    async def generate_video(
        self,
        script: str,
        seller,
        product,
        duration_seconds: float = 10,
        reference_video_path: Optional[str] = None,
    ) -> dict:
        """Generate a video ad using the selected provider.

        Currently returns a mock result. The structure is designed so real
        provider integrations can be plugged in via _generate_hailuo,
        _generate_runway, _generate_heygen methods.
        """
        task_id = str(uuid.uuid4())

        # Dispatch to provider-specific method (all mock for now)
        if self.provider == "hailuo":
            return await self._generate_hailuo(task_id, script, seller, product, duration_seconds, reference_video_path)
        elif self.provider == "runway":
            return await self._generate_runway(task_id, script, seller, product, duration_seconds, reference_video_path)
        elif self.provider == "heygen":
            return await self._generate_heygen(task_id, script, seller, product, duration_seconds, reference_video_path)

        return self._mock_result(task_id, duration_seconds)

    async def _generate_hailuo(self, task_id, script, seller, product, duration, ref_path) -> dict:
        """Hailuo MiniMax video generation. Mock for now."""
        api_key = settings.HAILUO_API_KEY
        if api_key:
            # TODO: Wire real Hailuo API when key is provided
            pass
        return self._mock_result(task_id, duration)

    async def _generate_runway(self, task_id, script, seller, product, duration, ref_path) -> dict:
        """Runway Gen-4 video generation. Mock for now."""
        api_key = settings.RUNWAY_API_KEY
        if api_key:
            # TODO: Wire real Runway API when key is provided
            pass
        return self._mock_result(task_id, duration)

    async def _generate_heygen(self, task_id, script, seller, product, duration, ref_path) -> dict:
        """HeyGen video generation. Mock for now."""
        api_key = settings.HEYGEN_API_KEY
        if api_key:
            # TODO: Wire real HeyGen API when key is provided
            pass
        return self._mock_result(task_id, duration)

    def _mock_result(self, task_id: str, duration_seconds: float) -> dict:
        """Return a mock video generation result."""
        cost = self.PROVIDERS[self.provider]["cost_per_second"] * duration_seconds
        return {
            "task_id": task_id,
            "status": "ready",  # Mock: instantly ready
            "provider": self.provider,
            "provider_name": self.PROVIDERS[self.provider]["name"],
            "duration_seconds": duration_seconds,
            "cost_usd": round(cost, 4),
            "filename": f"video_{task_id[:8]}.mp4",
            "mock": True,
        }

    # ------------------------------------------------------------------
    # Status check
    # ------------------------------------------------------------------

    async def check_status(self, task_id: str) -> dict:
        """Check video generation status.

        Mock implementation: always returns 'ready'.
        Real implementation would poll the provider API.
        """
        return {
            "task_id": task_id,
            "status": "ready",
            "provider": self.provider,
            "progress": 100,
            "mock": True,
        }
