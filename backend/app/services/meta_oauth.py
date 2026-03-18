import httpx
from typing import Dict, List, Optional


class MetaOAuthService:
    """Handle Facebook/Meta OAuth flow for ads integration."""

    GRAPH_URL = "https://graph.facebook.com/v18.0"
    OAUTH_URL = "https://www.facebook.com/v18.0/dialog/oauth"

    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret

    def get_auth_url(self, redirect_uri: str) -> str:
        """Generate Facebook OAuth authorization URL."""
        scopes = "ads_management,ads_read,business_management,pages_read_engagement"
        return (
            f"{self.OAUTH_URL}"
            f"?client_id={self.app_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scopes}"
            f"&response_type=code"
        )

    async def exchange_code(self, code: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for access token."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Get short-lived token
            response = await client.get(
                f"{self.GRAPH_URL}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
            )
            if response.status_code != 200:
                error = response.json().get("error", {})
                return {"error": error.get("message", "Erro ao trocar codigo por token")}

            data = response.json()
            short_token = data.get("access_token", "")

            # Exchange for long-lived token (60 days)
            response2 = await client.get(
                f"{self.GRAPH_URL}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": short_token,
                },
            )
            if response2.status_code == 200:
                long_data = response2.json()
                return {"access_token": long_data.get("access_token", short_token)}

            # Fallback to short-lived token
            return {"access_token": short_token}

    async def get_user_info(self, access_token: str) -> Dict:
        """Get Facebook user name and ID."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.GRAPH_URL}/me",
                params={"access_token": access_token, "fields": "id,name"},
            )
            if response.status_code == 200:
                return response.json()
            return {"name": "Usuario Facebook", "id": ""}

    async def get_pages(self, access_token: str) -> List[Dict]:
        """List user's Facebook Pages (needed for ad creatives)."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.GRAPH_URL}/me/accounts",
                params={
                    "access_token": access_token,
                    "fields": "id,name,access_token",
                },
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
            return []

    async def get_ad_accounts(self, access_token: str) -> List[Dict]:
        """List user's ad accounts."""
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                f"{self.GRAPH_URL}/me/adaccounts",
                params={
                    "access_token": access_token,
                    "fields": "id,name,account_status,currency,business_name",
                },
            )
            if response.status_code == 200:
                data = response.json()
                accounts = data.get("data", [])
                return [
                    {
                        "id": acc["id"],
                        "name": acc.get("name", acc["id"]),
                        "status": acc.get("account_status", 0),
                        "currency": acc.get("currency", "BRL"),
                        "business_name": acc.get("business_name", ""),
                    }
                    for acc in accounts
                ]
            return []
