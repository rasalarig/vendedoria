import httpx
import json
from typing import Dict, List, Optional


class MetaPixelService:
    def __init__(self, access_token: str = "", ad_account_id: str = ""):
        self.access_token = access_token
        if ad_account_id and not ad_account_id.startswith("act_"):
            ad_account_id = f"act_{ad_account_id}"
        self.ad_account_id = ad_account_id
        self.base_url = "https://graph.facebook.com/v22.0"
        self.is_mock = not (access_token and ad_account_id)

    async def create_pixel(self, name: str = "VendedorIA Pixel") -> Dict:
        """Create a new Meta Pixel for the ad account."""
        if self.is_mock:
            return {"id": "mock_pixel_123456", "name": name, "is_mock": True}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/{self.ad_account_id}/adspixels",
                    data={"name": name, "access_token": self.access_token},
                )
                if response.status_code == 200:
                    data = response.json()
                    return {"id": data.get("id"), "name": name, "is_mock": False}
                else:
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get("error", {}).get("error_user_msg") or error_data.get("error", {}).get("message", "Erro ao criar pixel")
                    return {"id": None, "error": error_msg}
        except Exception as e:
            return {"id": None, "error": f"Erro de conexao: {str(e)}"}

    async def list_pixels(self) -> List[Dict]:
        """List all pixels for the ad account."""
        if self.is_mock:
            return [{"id": "mock_pixel_123456", "name": "VendedorIA Pixel (Simulado)", "is_mock": True}]
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/{self.ad_account_id}/adspixels",
                    params={"access_token": self.access_token, "fields": "id,name,creation_time,last_fired_time"},
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get("data", [])
                return []
        except Exception:
            return []

    async def get_pixel_code(self, pixel_id: str) -> Dict:
        """Get the JavaScript code snippet for a pixel."""
        if self.is_mock or pixel_id.startswith("mock_"):
            return {
                "id": pixel_id,
                "code": f"<!-- Meta Pixel Code (Simulado) -->\n<script>\n  // Pixel ID: {pixel_id}\n  // Modo simulado - instale o pixel real apos conectar Meta Ads\n</script>",
                "is_mock": True,
            }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/{pixel_id}",
                    params={"access_token": self.access_token, "fields": "id,name,code"},
                )
                if response.status_code == 200:
                    data = response.json()
                    return {"id": data.get("id"), "name": data.get("name"), "code": data.get("code", ""), "is_mock": False}
                else:
                    error_data = response.json() if response.text else {}
                    error_msg = error_data.get("error", {}).get("message", "Erro ao obter codigo do pixel")
                    return {"id": pixel_id, "code": "", "error": error_msg}
        except Exception as e:
            return {"id": pixel_id, "code": "", "error": str(e)}

    async def get_pixel_stats(self, pixel_id: str) -> Dict:
        """Get pixel firing statistics."""
        if self.is_mock or pixel_id.startswith("mock_"):
            return {"total_events": 0, "is_mock": True}
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/{pixel_id}/stats",
                    params={"access_token": self.access_token, "aggregation": "event"},
                )
                if response.status_code == 200:
                    data = response.json()
                    events = data.get("data", [])
                    total = sum(int(e.get("count", 0)) for e in events)
                    return {"total_events": total, "events": events}
                return {"total_events": 0}
        except Exception:
            return {"total_events": 0}
