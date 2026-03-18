from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.sql import func
from app.core.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), nullable=True)
    phone = Column(String(20), nullable=True)
    source = Column(String(100), nullable=True)  # meta_ads, whatsapp, manual, csv_import, landing_page
    tags = Column(String(500), nullable=True)  # comma-separated
    funnel_status = Column(String(30), default="novo")  # novo, contatado, interessado, convertido, perdido
    product_interest = Column(String(200), nullable=True)
    value = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class LeadInteraction(Base):
    __tablename__ = "lead_interactions"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    type = Column(String(50), nullable=False)  # status_change, note, whatsapp_sent, whatsapp_replied, meta_click, email, call
    description = Column(Text, nullable=False)
    old_value = Column(String(100), nullable=True)
    new_value = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
