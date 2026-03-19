"""
TikTok Ads Service - Demo/Placeholder
Real integration requires TikTok Business API credentials.
"""


class TikTokAdsService:
    def __init__(self, access_token: str = "", advertiser_id: str = ""):
        self.access_token = access_token
        self.advertiser_id = advertiser_id
        self.is_mock = not (access_token and advertiser_id)

    async def create_campaign(self, name: str, daily_budget: float, product_name: str) -> dict:
        """Create a TikTok Ads campaign (demo mode)."""
        if self.is_mock:
            return {
                "success": True,
                "is_mock": True,
                "campaign_id": f"tiktok_demo_{name.replace(' ', '_').lower()}",
                "message": "Campanha criada em modo demonstracao. Configure as credenciais TikTok Business para publicar.",
            }
        # TODO: Implement real TikTok Ads API integration
        return {"success": False, "error": "TikTok Ads API integration not yet implemented."}
