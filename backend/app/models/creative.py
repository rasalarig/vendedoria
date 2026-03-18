from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class Creative(Base):
    __tablename__ = "creatives"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    variation = Column(Integer, default=1)
    headline = Column(String(300), nullable=True)
    copy_text = Column(Text, nullable=True)
    cta = Column(String(200), nullable=True)
    image_url = Column(String(1000), nullable=True)
    image_prompt = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
