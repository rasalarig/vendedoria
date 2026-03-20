from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    creative_id = Column(Integer, ForeignKey("creatives.id"), nullable=True)
    name = Column(String(300), nullable=False)
    platform = Column(String(50), default="meta")  # meta, whatsapp
    status = Column(String(30), default="draft")  # draft, active, paused, completed, error
    objective = Column(String(50), default="CONVERSIONS")
    # Meta Ads IDs (when real API is used)
    meta_campaign_id = Column(String(100), nullable=True)
    meta_adset_id = Column(String(100), nullable=True)
    meta_ad_id = Column(String(100), nullable=True)
    meta_creative_id = Column(String(100), nullable=True)
    meta_errors = Column(Text, nullable=True)  # JSON string of errors during creation
    # Targeting (stored as JSON)
    targeting = Column(JSON, nullable=True)  # {age_min, age_max, genders, interests, locations, lookalike}
    # Budget
    daily_budget = Column(Float, default=0.0)
    total_budget = Column(Float, default=0.0)
    spent = Column(Float, default=0.0)
    # Metrics (updated periodically or mock)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    leads = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    ctr = Column(Float, default=0.0)  # Click-through rate
    cpc = Column(Float, default=0.0)  # Cost per click
    cpl = Column(Float, default=0.0)  # Cost per lead
    # AI Strategy
    ai_strategy = Column(Text, nullable=True)  # AI reasoning for targeting decisions
    user_id = Column(Integer, nullable=True, default=None, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
