import asyncio
import csv
import io
import random
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.whatsapp import Contact, WhatsAppCampaign, WhatsAppMessage
from app.models.product import Product


class WhatsAppService:
    """WhatsApp Business Cloud API service with mock mode fallback."""

    def __init__(self, access_token: str = "", phone_number_id: str = ""):
        self.access_token = access_token
        self.phone_number_id = phone_number_id
        self.mock_mode = not access_token or not phone_number_id

    async def send_message(self, phone: str, text: str) -> dict:
        """Send a WhatsApp message via Cloud API or mock."""
        if self.mock_mode:
            # Simulate sending with random delay
            await asyncio.sleep(random.uniform(0.05, 0.3))
            success = random.random() < 0.92  # 92% success rate
            if success:
                return {
                    "success": True,
                    "message_id": f"mock_wamid_{random.randint(100000, 999999)}",
                }
            else:
                return {
                    "success": False,
                    "error": "Mock: message delivery failed",
                }

        # Real WhatsApp Cloud API call (placeholder)
        import httpx

        url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "text",
            "text": {"body": text},
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code == 200:
                data = response.json()
                return {
                    "success": True,
                    "message_id": data.get("messages", [{}])[0].get("id", ""),
                }
            else:
                return {
                    "success": False,
                    "error": response.text,
                }

    @staticmethod
    def personalize_message(
        template: str,
        contact_name: str,
        product_name: str = "",
        price: str = "",
    ) -> str:
        """Replace template variables {nome}, {produto}, {preco}."""
        text = template.replace("{nome}", contact_name)
        text = text.replace("{produto}", product_name)
        text = text.replace("{preco}", price)
        return text

    @staticmethod
    def import_contacts_csv(file_content: str) -> list[dict]:
        """Parse CSV with columns: nome,telefone,tags. Returns list of contact dicts."""
        contacts = []
        reader = csv.reader(io.StringIO(file_content))
        for i, row in enumerate(reader):
            if not row or len(row) < 2:
                continue
            # Skip header row
            if i == 0 and row[0].strip().lower() in ("nome", "name"):
                continue
            name = row[0].strip()
            phone = row[1].strip()
            tags = row[2].strip() if len(row) > 2 else ""
            if name and phone:
                contacts.append({"name": name, "phone": phone, "tags": tags})
        return contacts

    async def send_campaign(self, campaign_id: int, db: Session) -> dict:
        """Send all pending messages for a campaign."""
        campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
        if not campaign:
            return {"error": "Campanha nao encontrada"}

        campaign.status = "sending"
        db.commit()

        # Get product info for personalization
        product_name = ""
        product_price = ""
        if campaign.product_id:
            product = db.query(Product).filter(Product.id == campaign.product_id).first()
            if product:
                product_name = product.name
                product_price = f"R$ {product.price:.2f}"

        messages = (
            db.query(WhatsAppMessage)
            .filter(
                WhatsAppMessage.campaign_id == campaign_id,
                WhatsAppMessage.status == "pending",
            )
            .all()
        )

        for msg in messages:
            # Check if campaign was paused
            db.refresh(campaign)
            if campaign.status == "paused":
                break

            result = await self.send_message(msg.message_text.split("\n")[0] if msg.message_text else "", msg.message_text)

            now = datetime.now(timezone.utc)

            if result.get("success"):
                msg.status = "sent"
                msg.sent_at = now
                msg.meta_message_id = result.get("message_id", "")
                campaign.sent_count = (campaign.sent_count or 0) + 1

                # In mock mode, simulate delivery/read/reply status
                if self.mock_mode:
                    await asyncio.sleep(random.uniform(0.02, 0.1))
                    if random.random() < 0.80:
                        msg.status = "delivered"
                        campaign.delivered_count = (campaign.delivered_count or 0) + 1
                        if random.random() < 0.60:
                            msg.status = "read"
                            campaign.read_count = (campaign.read_count or 0) + 1
                            if random.random() < 0.20:
                                msg.status = "replied"
                                campaign.replied_count = (campaign.replied_count or 0) + 1
            else:
                msg.status = "error"
                campaign.error_count = (campaign.error_count or 0) + 1

            db.commit()

        # Final status update
        db.refresh(campaign)
        if campaign.status == "sending":
            campaign.status = "completed"
            db.commit()

        return {
            "campaign_id": campaign.id,
            "status": campaign.status,
            "sent": campaign.sent_count,
            "delivered": campaign.delivered_count,
            "read": campaign.read_count,
            "replied": campaign.replied_count,
            "errors": campaign.error_count,
        }
