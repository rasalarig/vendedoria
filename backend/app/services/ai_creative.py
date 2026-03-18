import httpx
import json
from urllib.parse import quote
from typing import List, Dict


class AICreativeService:

    def __init__(self, ai_api_key: str = "", ai_provider: str = "claude"):
        self.ai_api_key = ai_api_key
        self.ai_provider = ai_provider

    def _format_price_context(self, price: float, pricing_type: str, recurrence_period: str = "") -> str:
        """Format price string with pricing type context for AI prompts."""
        if pricing_type == "monthly":
            return f"assinatura mensal de R$ {price:.2f}/mes"
        elif pricing_type == "yearly":
            return f"assinatura anual de R$ {price:.2f}/ano"
        elif pricing_type == "weekly":
            return f"assinatura semanal de R$ {price:.2f}/semana"
        elif pricing_type == "custom" and recurrence_period:
            return f"assinatura de R$ {price:.2f}/{recurrence_period}"
        else:
            return f"investimento unico de R$ {price:.2f}"

    async def generate_copy(self, product_name: str, description: str, price: float,
                            target_audience: str, differentials: str,
                            pricing_type: str = "one_time", recurrence_period: str = "") -> List[Dict]:
        """Generate 3 variations of persuasive ad copy using Claude API or fallback."""

        price_context = self._format_price_context(price, pricing_type, recurrence_period)

        prompt = f"""Voce e um especialista em marketing digital com 15 anos de experiencia em copywriting persuasivo e vendas online.

Crie 3 variacoes de anuncio para o seguinte produto:

PRODUTO: {product_name}
DESCRICAO: {description}
PRECO: {price_context}
TIPO DE COBRANCA: {"Recorrente (assinatura)" if pricing_type != "one_time" else "Pagamento unico"}
PUBLICO-ALVO: {target_audience}
DIFERENCIAIS: {differentials}

Para CADA variacao, retorne em formato JSON:
- "headline": titulo chamativo (max 60 caracteres)
- "copy_text": texto persuasivo do anuncio (max 300 caracteres), use gatilhos mentais (escassez, prova social, autoridade, urgencia)
- "cta": call-to-action (max 30 caracteres)
- "image_prompt": prompt em ingles para gerar uma imagem de anuncio profissional para este produto (descreva estilo, cores, elementos visuais)

Retorne APENAS um array JSON com 3 objetos. Sem explicacoes extras. Seja ASSERTIVO e focado em CONVERSAO."""

        # Try to use Claude API if key available
        if self.ai_api_key and self.ai_provider == "claude":
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://api.anthropic.com/v1/messages",
                        headers={
                            "x-api-key": self.ai_api_key,
                            "anthropic-version": "2023-06-01",
                            "content-type": "application/json"
                        },
                        json={
                            "model": "claude-sonnet-4-20250514",
                            "max_tokens": 2000,
                            "messages": [{"role": "user", "content": prompt}]
                        }
                    )
                    if response.status_code == 200:
                        data = response.json()
                        text = data["content"][0]["text"]
                        start = text.find("[")
                        end = text.rfind("]") + 1
                        if start >= 0 and end > start:
                            return json.loads(text[start:end])
            except Exception as e:
                print(f"Claude API error: {e}")

        # Smart fallback using actual product data
        price_display = f"R${price:.2f}"
        if pricing_type == "monthly":
            price_display += "/mes"
        elif pricing_type == "yearly":
            price_display += "/ano"
        elif pricing_type == "weekly":
            price_display += "/semana"
        elif pricing_type == "custom" and recurrence_period:
            price_display += f"/{recurrence_period}"

        variations = [
            {
                "headline": f"{product_name} - Transforme Seus Resultados"[:60],
                "copy_text": (f"Descubra o {product_name}! {description[:100] if description else 'A solucao que voce precisa'}. "
                             f"Por apenas {price_display}. {differentials[:80] if differentials else 'Resultados comprovados'}. "
                             f"Ideal para {target_audience[:60] if target_audience else 'quem busca o melhor'}. Comece agora!")[:300],
                "cta": "Saiba Mais",
                "image_prompt": f"Professional marketing banner for {product_name}, modern design, vibrant colors",
            },
            {
                "headline": f"Oferta Especial: {product_name}"[:60],
                "copy_text": (f"Voce ja conhece o {product_name}? {description[:80] if description else 'Uma solucao completa'} - "
                             f"e o melhor: por {price_display}! "
                             f"Mais de milhares de clientes satisfeitos. {differentials[:60] if differentials else 'Qualidade garantida'}. "
                             f"Nao perca essa oportunidade!")[:300],
                "cta": "Aproveitar Agora",
                "image_prompt": f"Eye-catching promotional banner for {product_name}, sale theme, professional",
            },
            {
                "headline": f"Por Que Escolher {product_name}?"[:60],
                "copy_text": (f"Se voce e {target_audience[:60] if target_audience else 'alguem que busca qualidade'}, "
                             f"o {product_name} foi feito para voce! "
                             f"{differentials[:80] if differentials else 'Diferenciais unicos no mercado'}. "
                             f"Investimento: {price_display}. Comece sua jornada hoje!")[:300],
                "cta": "Comecar Agora",
                "image_prompt": f"Inspiring marketing image for {product_name}, trust and quality theme",
            },
        ]
        return variations

    def generate_image_url(self, prompt: str, width: int = 800, height: int = 600) -> str:
        """Generate image URL using Pollinations.ai (100% free, no API key needed)."""
        encoded = quote(prompt)
        return f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true"
