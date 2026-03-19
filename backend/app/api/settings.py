from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.settings import Settings
from app.models.product import Product
from app.models.creative import Creative
from app.services.meta_ads import MetaAdsService

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsSchema(BaseModel):
    meta_app_id: Optional[str] = ""
    meta_app_secret: Optional[str] = ""
    meta_access_token: Optional[str] = ""
    meta_ad_account_id: Optional[str] = ""
    meta_user_name: Optional[str] = ""
    facebook_page_id: Optional[str] = ""
    whatsapp_phone_id: Optional[str] = ""
    whatsapp_token: Optional[str] = ""
    whatsapp_business_id: Optional[str] = ""
    ai_api_key: Optional[str] = ""
    ai_provider: Optional[str] = "claude"
    operation_mode: Optional[str] = "manual"
    daily_budget_limit: Optional[float] = 0.0
    monthly_budget_limit: Optional[float] = 0.0


class SettingsResponse(SettingsSchema):
    id: int

    class Config:
        from_attributes = True


@router.get("/status")
async def get_settings_status(db: Session = Depends(get_db)):
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        return {
            "ai_configured": False,
            "meta_configured": False,
            "whatsapp_configured": False
        }
    return {
        "ai_configured": bool(settings.ai_api_key and len(settings.ai_api_key) > 0),
        "meta_configured": bool(
            settings.meta_app_id and len(settings.meta_app_id) > 0 and
            settings.meta_access_token and len(settings.meta_access_token) > 0 and
            settings.meta_ad_account_id and len(settings.meta_ad_account_id) > 0
        ),
        "whatsapp_configured": bool(
            settings.whatsapp_phone_id and len(settings.whatsapp_phone_id) > 0 and
            settings.whatsapp_token and len(settings.whatsapp_token) > 0
        )
    }


@router.get("/token-status")
async def check_token_status(db: Session = Depends(get_db)):
    """Check if the Meta access token is still valid."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token:
        return {"valid": False, "configured": False, "message": "Token Meta nao configurado."}

    meta_service = MetaAdsService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id or "",
    )
    result = await meta_service.check_token_validity()
    result["configured"] = True
    return result


@router.get("", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db)):
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("", response_model=SettingsResponse)
async def update_settings(data: SettingsSchema, db: Session = Depends(get_db)):
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        settings = Settings(id=1)
        db.add(settings)
    for key, value in data.dict(exclude_unset=True).items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/prerequisites")
async def check_prerequisites(db: Session = Depends(get_db)):
    """Check all prerequisites needed before creating a campaign."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    checks = {
        "meta_connected": bool(settings and settings.meta_access_token),
        "ad_account": bool(settings and settings.meta_ad_account_id),
        "facebook_page": bool(settings and settings.facebook_page_id),
        "pixel_configured": bool(settings and settings.meta_pixel_id),
        "payment_method": False,
        "has_product": False,
        "has_creative": False,
    }

    # Check if products exist
    checks["has_product"] = db.query(Product).count() > 0

    # Check if creatives exist
    checks["has_creative"] = db.query(Creative).count() > 0

    # Check payment if connected
    if checks["meta_connected"] and checks["ad_account"]:
        try:
            meta = MetaAdsService(settings.meta_access_token, settings.meta_ad_account_id)
            payment = await meta.check_payment()
            checks["payment_method"] = payment.get("has_payment", False)
        except Exception:
            checks["payment_method"] = False

    # Overall readiness
    checks["ready_for_campaign"] = all([
        checks["meta_connected"], checks["ad_account"],
        checks["facebook_page"], checks["has_product"], checks["has_creative"]
    ])

    return checks
