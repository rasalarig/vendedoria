import httpx
import json
import os
import hashlib
import asyncio
import random
from urllib.parse import quote
from typing import List, Dict
from pathlib import Path

_data_dir = Path("/app/data") if Path("/app/data").exists() else Path(__file__).parent.parent.parent
UPLOADS_DIR = _data_dir / "uploads" / "creatives"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


class AICreativeService:

    def __init__(self, ai_api_key: str = "", ai_provider: str = "claude", image_api_key: str = ""):
        self.ai_api_key = ai_api_key
        self.ai_provider = ai_provider
        self.image_api_key = image_api_key

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
        """Generate 1 persuasive ad copy variation using Claude API or fallback."""

        price_context = self._format_price_context(price, pricing_type, recurrence_period)

        prompt = f"""Voce e um especialista em marketing digital com 15 anos de experiencia em copywriting persuasivo e vendas online.

Crie 1 anuncio persuasivo para o seguinte produto:

PRODUTO: {product_name}
DESCRICAO: {description}
PRECO: {price_context}
TIPO DE COBRANCA: {"Recorrente (assinatura)" if pricing_type != "one_time" else "Pagamento unico"}
PUBLICO-ALVO: {target_audience}
DIFERENCIAIS: {differentials}

Retorne em formato JSON:
- "headline": titulo chamativo (max 60 caracteres)
- "copy_text": texto persuasivo do anuncio (max 300 caracteres), use gatilhos mentais (escassez, prova social, autoridade, urgencia)
- "cta": call-to-action (max 30 caracteres)
- "image_prompt": prompt em ingles para gerar uma imagem de anuncio profissional para este produto (descreva estilo, cores, elementos visuais)

Retorne APENAS um array JSON com 1 objeto. Sem explicacoes extras. Seja ASSERTIVO e focado em CONVERSAO."""

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
        ]
        return variations

    async def generate_and_save_image(self, prompt: str, product_name: str = "", width: int = 800, height: int = 600) -> str:
        """Generate an image and save it locally. Returns local URL path."""
        filename = hashlib.md5(f"{prompt}_{width}_{height}".encode()).hexdigest() + ".png"
        filepath = UPLOADS_DIR / filename

        # If already exists, return it
        if filepath.exists() and filepath.stat().st_size > 1000:
            return f"/uploads/creatives/{filename}"

        # 1. Try Together AI FLUX (reliable, needs API key with credits)
        image_data = await self._try_together_flux(prompt, width, height)

        # 2. Try AI Horde (free, crowdsourced, no key needed)
        if not image_data:
            image_data = await self._try_ai_horde(prompt)

        # 3. Try Pollinations.ai (free, no key, but unreliable)
        if not image_data:
            image_data = await self._try_pollinations(prompt, width, height)

        # 4. Try DALL-E (if OpenAI key available)
        if not image_data and self.ai_api_key and self.ai_provider == "openai":
            image_data = await self._try_dalle(prompt)

        # 5. Pillow placeholder (always works)
        if not image_data:
            image_data = self._generate_placeholder(product_name or prompt, width, height)

        if image_data:
            filepath.write_bytes(image_data)
            return f"/uploads/creatives/{filename}"

        # Ultimate fallback - return Pollinations URL (lazy load in browser)
        return self.generate_image_url(prompt, width, height)

    async def _try_together_flux(self, prompt: str, width: int = 768, height: int = 512) -> bytes | None:
        """Generate image using Together AI FLUX model."""
        if not self.image_api_key:
            return None
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    "https://api.together.xyz/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {self.image_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "black-forest-labs/FLUX.1-schnell",
                        "prompt": prompt,
                        "width": width,
                        "height": height,
                        "steps": 4,
                        "n": 1,
                        "response_format": "b64_json",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    import base64
                    b64_data = data["data"][0]["b64_json"]
                    return base64.b64decode(b64_data)
                else:
                    print(f"Together AI error {response.status_code}: {response.text[:200]}")
        except Exception as e:
            print(f"Together AI FLUX generation failed: {e}")
        return None

    async def _try_ai_horde(self, prompt: str) -> bytes | None:
        """Generate image using AI Horde (free, crowdsourced Stable Diffusion)."""
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                # Submit generation job
                resp = await client.post(
                    "https://stablehorde.net/api/v2/generate/async",
                    json={
                        "prompt": f"{prompt} ### ugly, blurry, text, watermark, low quality",
                        "params": {
                            "width": 512,
                            "height": 512,
                            "steps": 20,
                            "n": 1,
                            "sampler_name": "k_euler",
                            "cfg_scale": 7,
                        },
                        "r2": False,
                        "nsfw": False,
                        "shared": False,
                    },
                    headers={
                        "Content-Type": "application/json",
                        "apikey": "0000000000",
                        "Client-Agent": "vendedoria:1.0",
                    },
                )
                if resp.status_code != 202:
                    print(f"AI Horde submit error {resp.status_code}: {resp.text[:200]}")
                    return None

                job_id = resp.json().get("id")
                if not job_id:
                    return None

                # Poll for completion (max ~90 seconds)
                for _ in range(18):
                    await asyncio.sleep(5)
                    check = await client.get(f"https://stablehorde.net/api/v2/generate/check/{job_id}")
                    if check.status_code == 200 and check.json().get("done"):
                        break
                else:
                    print("AI Horde timeout after 90s")
                    return None

                # Get result
                result = await client.get(f"https://stablehorde.net/api/v2/generate/status/{job_id}")
                if result.status_code != 200:
                    return None

                generations = result.json().get("generations", [])
                if not generations:
                    return None

                img_data = generations[0].get("img", "")
                if not img_data:
                    return None

                # Handle URL or base64
                if img_data.startswith("http"):
                    img_resp = await client.get(img_data)
                    if img_resp.status_code == 200 and len(img_resp.content) > 1000:
                        return img_resp.content
                else:
                    import base64
                    decoded = base64.b64decode(img_data)
                    if len(decoded) > 1000:
                        return decoded

        except Exception as e:
            print(f"AI Horde generation failed: {e}")
        return None

    async def _try_pollinations(self, prompt: str, width: int, height: int) -> bytes | None:
        """Try Pollinations.ai with retries."""
        for attempt in range(3):
            try:
                seed = random.randint(1, 999999)
                encoded = quote(prompt)
                url = f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true&seed={seed}"
                async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as client:
                    response = await client.get(url)
                    if response.status_code == 200 and len(response.content) > 1000:
                        content_type = response.headers.get("content-type", "")
                        if "image" in content_type or len(response.content) > 5000:
                            return response.content
            except Exception as e:
                print(f"Pollinations attempt {attempt+1} failed: {e}")
            if attempt < 2:
                await asyncio.sleep(2 * (attempt + 1))
        return None

    async def _try_dalle(self, prompt: str) -> bytes | None:
        """Try OpenAI DALL-E for image generation."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={
                        "Authorization": f"Bearer {self.ai_api_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": "dall-e-3",
                        "prompt": prompt,
                        "n": 1,
                        "size": "1024x1024",
                        "response_format": "url",
                    },
                )
                if response.status_code == 200:
                    data = response.json()
                    image_url = data["data"][0]["url"]
                    # Download the image
                    img_response = await client.get(image_url)
                    if img_response.status_code == 200:
                        return img_response.content
        except Exception as e:
            print(f"DALL-E generation failed: {e}")
        return None

    def _generate_placeholder(self, product_name: str, width: int = 800, height: int = 600) -> bytes | None:
        """Generate a professional placeholder image with product name using Pillow."""
        try:
            from PIL import Image, ImageDraw, ImageFont
            import io

            # Create gradient background
            img = Image.new('RGB', (width, height))
            draw = ImageDraw.Draw(img)

            # Purple gradient (matches VendedorIA brand)
            for y in range(height):
                r = int(88 + (y / height) * 30)
                g = int(28 + (y / height) * 40)
                b = int(135 + (y / height) * 80)
                draw.line([(0, y), (width, y)], fill=(r, g, b))

            # Add decorative elements
            draw.rounded_rectangle([40, 40, width-40, height-40], radius=20, outline=(255, 255, 255, 128), width=2)

            # Add product name text
            try:
                font_large = ImageFont.truetype("arial.ttf", 48)
                font_small = ImageFont.truetype("arial.ttf", 24)
            except OSError:
                font_large = ImageFont.load_default()
                font_small = font_large

            # Center the product name
            text = product_name[:40]
            bbox = draw.textbbox((0, 0), text, font=font_large)
            text_width = bbox[2] - bbox[0]
            text_x = (width - text_width) // 2
            text_y = height // 2 - 40

            # Text shadow
            draw.text((text_x + 2, text_y + 2), text, fill=(0, 0, 0), font=font_large)
            draw.text((text_x, text_y), text, fill=(255, 255, 255), font=font_large)

            # Subtitle
            subtitle = "Anuncio Profissional"
            bbox2 = draw.textbbox((0, 0), subtitle, font=font_small)
            sub_width = bbox2[2] - bbox2[0]
            draw.text(((width - sub_width) // 2, text_y + 60), subtitle, fill=(200, 200, 220), font=font_small)

            # Save to bytes
            buffer = io.BytesIO()
            img.save(buffer, format='PNG', quality=95)
            return buffer.getvalue()
        except ImportError:
            print("Pillow not installed - cannot generate placeholder")
            return None

    def generate_image_url(self, prompt: str, width: int = 800, height: int = 600) -> str:
        """Generate image URL using Pollinations.ai (fallback for lazy loading)."""
        encoded = quote(prompt)
        return f"https://image.pollinations.ai/prompt/{encoded}?width={width}&height={height}&nologo=true"
