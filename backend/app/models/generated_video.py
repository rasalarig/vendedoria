from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class GeneratedVideo(Base):
    __tablename__ = "generated_videos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    seller_id = Column(Integer, nullable=True)
    product_id = Column(Integer, nullable=True)
    reference_video_id = Column(Integer, nullable=True)
    filename = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=False)
    duration = Column(Float, nullable=True)
    status = Column(String(50), nullable=False, default="generating")  # generating, ready, failed, approved
    provider = Column(String(50), nullable=True)  # veo3
    cost_usd = Column(Float, nullable=True)
    script = Column(Text, nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
