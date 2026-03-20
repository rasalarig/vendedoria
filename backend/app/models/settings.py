from sqlalchemy import Column, Integer, String, Float
from app.core.database import Base
import enum


class OperationMode(str, enum.Enum):
    MANUAL = "manual"           # Aprova tudo antes de executar
    SEMI_AUTO = "semi_auto"     # Aprova so artes/criativos
    AUTO = "auto"               # Piloto automatico - IA faz tudo


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=True, default=None, index=True)
    # Meta Ads credentials
    meta_app_id = Column(String(200), default="")
    meta_app_secret = Column(String(500), default="")
    meta_access_token = Column(String(500), default="")
    meta_ad_account_id = Column(String(100), default="")
    meta_user_name = Column(String(200), default="")
    facebook_page_id = Column(String(100), default="")
    # WhatsApp Business
    whatsapp_phone_id = Column(String(100), default="")
    whatsapp_token = Column(String(500), default="")
    whatsapp_business_id = Column(String(100), default="")
    # AI Key
    ai_api_key = Column(String(500), default="")
    ai_provider = Column(String(50), default="claude")  # claude, openai
    # Operation Mode
    operation_mode = Column(String(20), default=OperationMode.MANUAL.value)
    # Meta Pixel
    meta_pixel_id = Column(String(100), default="")
    # TikTok Ads
    tiktok_access_token = Column(String(500), nullable=True, default="")
    tiktok_advertiser_id = Column(String(100), nullable=True, default="")
    # Image Generation API
    image_api_key = Column(String(500), nullable=True, default="")
    image_api_provider = Column(String(50), nullable=True, default="together")
    # Budget Limits
    daily_budget_limit = Column(Float, default=0.0)
    monthly_budget_limit = Column(Float, default=0.0)
    # Meta App Mode (development, live, unknown)
    meta_app_mode = Column(String(20), default="unknown")
