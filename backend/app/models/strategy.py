from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from app.core.database import Base


class MarketStrategy(Base):
    __tablename__ = "market_strategies"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    market_analysis = Column(Text, nullable=True)
    target_audience_analysis = Column(Text, nullable=True)
    best_times = Column(JSON, nullable=True)
    recommended_channels = Column(JSON, nullable=True)
    tone_of_voice = Column(Text, nullable=True)
    selling_arguments = Column(JSON, nullable=True)
    common_objections = Column(JSON, nullable=True)
    budget_suggestion = Column(Text, nullable=True)
    competitor_insights = Column(Text, nullable=True)
    web_research_data = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
