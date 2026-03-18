from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.settings import Settings

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
