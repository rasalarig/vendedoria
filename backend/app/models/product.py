from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    target_audience = Column(String(500), nullable=True)
    differentials = Column(Text, nullable=True)
    image_path = Column(String(500), nullable=True)
    product_type = Column(String(20), default="produto")  # produto, servico
    pricing_type = Column(String(20), default="one_time")  # one_time, monthly, yearly, weekly, custom
    recurrence_period = Column(String(50), nullable=True)  # custom period description if pricing_type is "custom"
    website_url = Column(String(500), nullable=True)  # Landing page URL for ad campaigns
    user_id = Column(Integer, nullable=True, default=None, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
