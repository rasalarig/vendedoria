from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    phone = Column(String(20), nullable=False)
    tags = Column(String(500), nullable=True)  # comma-separated tags
    status = Column(String(20), default="active")  # active, blocked, opted_out
    user_id = Column(Integer, nullable=True, default=None, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WhatsAppCampaign(Base):
    __tablename__ = "whatsapp_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    name = Column(String(300), nullable=False)
    template_text = Column(Text, nullable=False)
    status = Column(String(20), default="draft")  # draft, sending, completed, paused, error
    total_contacts = Column(Integer, default=0)
    sent_count = Column(Integer, default=0)
    delivered_count = Column(Integer, default=0)
    read_count = Column(Integer, default=0)
    replied_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    user_id = Column(Integer, nullable=True, default=None, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WhatsAppMessage(Base):
    __tablename__ = "whatsapp_messages"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("whatsapp_campaigns.id"), nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=False)
    message_text = Column(Text, nullable=False)
    status = Column(String(20), default="pending")  # pending, sent, delivered, read, replied, error
    sent_at = Column(DateTime(timezone=True), nullable=True)
    meta_message_id = Column(String(100), nullable=True)
