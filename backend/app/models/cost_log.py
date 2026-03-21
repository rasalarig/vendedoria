from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class CostLog(Base):
    __tablename__ = "cost_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(String(50), nullable=False)  # "video_generation", "image_generation", "tts"
    provider = Column(String(50), nullable=False)  # "veo3", "flux", "together"
    amount_usd = Column(Float, nullable=False, default=0.0)
    description = Column(String(500), nullable=True)
    reference_type = Column(String(50), nullable=True)  # "generated_video", "creative"
    reference_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
