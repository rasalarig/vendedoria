from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.settings import Settings
from app.models.product import Product
from app.models.creative import Creative
from app.services.meta_ads import MetaAdsService

router = APIRouter(prefix="/settings", tags=["settings"])


def get_user_settings(db: Session, user_id: int) -> Settings:
    """Get settings for a user, creating default if none exist."""
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings:
        settings = Settings(user_id=user_id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


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
    tiktok_access_token: Optional[str] = ""
    tiktok_advertiser_id: Optional[str] = ""
    image_api_key: Optional[str] = ""
    image_api_provider: Optional[str] = "together"
    daily_budget_limit: Optional[float] = 0.0
    monthly_budget_limit: Optional[float] = 0.0


class SettingsResponse(SettingsSchema):
    id: int

    class Config:
        from_attributes = True


@router.get("/status")
async def get_settings_status(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    settings = get_user_settings(db, user_id)
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
async def check_token_status(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Check if the Meta access token is still valid."""
    settings = get_user_settings(db, user_id)
    if not settings.meta_access_token:
        return {"valid": False, "configured": False, "message": "Token Meta nao configurado."}

    meta_service = MetaAdsService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id or "",
    )
    result = await meta_service.check_token_validity()
    result["configured"] = True
    return result


@router.get("", response_model=SettingsResponse)
async def get_settings(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    settings = get_user_settings(db, user_id)
    return settings


@router.put("", response_model=SettingsResponse)
async def update_settings(data: SettingsSchema, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    settings = get_user_settings(db, user_id)
    for key, value in data.dict(exclude_unset=True).items():
        setattr(settings, key, value)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/prerequisites")
async def check_prerequisites(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Check all prerequisites needed before creating a campaign."""
    settings = get_user_settings(db, user_id)
    checks = {
        "meta_connected": bool(settings.meta_access_token),
        "ad_account": bool(settings.meta_ad_account_id),
        "facebook_page": bool(settings.facebook_page_id),
        "pixel_configured": bool(settings.meta_pixel_id),
        "payment_method": False,
        "has_product": False,
        "has_creative": False,
        "app_mode": getattr(settings, "meta_app_mode", "unknown"),
        "app_mode_live": False,
    }

    # Check if products exist for this user
    checks["has_product"] = db.query(Product).filter(Product.user_id == user_id).count() > 0

    # Check if creatives exist for this user
    checks["has_creative"] = db.query(Creative).filter(Creative.user_id == user_id).count() > 0

    # Check payment if connected
    if checks["meta_connected"] and checks["ad_account"]:
        try:
            meta = MetaAdsService(settings.meta_access_token, settings.meta_ad_account_id)
            payment = await meta.check_payment()
            checks["payment_method"] = payment.get("has_payment", False)
            checks["is_prepaid"] = payment.get("is_prepaid", False)
            checks["balance"] = payment.get("balance", 0)
            checks["has_sufficient_funds"] = payment.get("has_sufficient_funds", False)
            checks["funding_type_label"] = payment.get("funding_type_label", "")
            checks["account_name"] = payment.get("account_name", "")
            checks["amount_spent"] = payment.get("amount_spent", 0)
            checks["currency"] = payment.get("currency", "")
        except Exception:
            checks["payment_method"] = False

    # Check app mode
    if checks["meta_connected"] and settings.meta_app_id:
        try:
            meta_mode = MetaAdsService(
                access_token=settings.meta_access_token,
                ad_account_id=settings.meta_ad_account_id or "",
            )
            mode_result = await meta_mode.check_app_mode(app_id=settings.meta_app_id)
            detected_mode = mode_result.get("mode", "unknown")
            checks["app_mode"] = detected_mode
            checks["app_mode_live"] = detected_mode == "live"
            # Persist detected mode
            if detected_mode in ("development", "live"):
                settings.meta_app_mode = detected_mode
                db.commit()
        except Exception:
            checks["app_mode"] = getattr(settings, "meta_app_mode", "unknown")
            checks["app_mode_live"] = checks["app_mode"] == "live"
    else:
        checks["app_mode_live"] = checks["app_mode"] == "live"

    # Overall readiness
    checks["ready_for_campaign"] = all([
        checks["meta_connected"], checks["ad_account"],
        checks["facebook_page"], checks["has_product"], checks["has_creative"],
        checks.get("has_sufficient_funds", checks.get("payment_method", False))
    ])

    return checks
