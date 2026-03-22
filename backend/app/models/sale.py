from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("generated_videos.id"), nullable=True)
    platform = Column(String(50), nullable=False)  # meta, tiktok, whatsapp
    sale_type = Column(String(50), nullable=True)  # direct, campaign, etc
    face_id = Column(String(100), nullable=True)
    script = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=True)
    status = Column(String(30), default="created")  # created, campaign_pending, campaign_active, campaign_error, completed
    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True)
    campaign_name = Column(String(300), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
