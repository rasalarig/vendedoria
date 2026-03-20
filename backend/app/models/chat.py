from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    attachment_path = Column(String(500), nullable=True)  # uploaded file path
    attachment_type = Column(String(50), nullable=True)  # image, csv, pdf
    action_taken = Column(String(100), nullable=True)  # "product_created", "creatives_generated", "campaign_created"
    action_data = Column(Text, nullable=True)  # JSON with action details
    user_id = Column(Integer, nullable=True, default=None, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
