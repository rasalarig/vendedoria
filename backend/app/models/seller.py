from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class Seller(Base):
    __tablename__ = "sellers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    avatar_face = Column(String(100), nullable=False)
    avatar_face_url = Column(String(500), nullable=True)
    voice_id = Column(String(100), nullable=False)
    personality = Column(String(50), nullable=False, default="informal")
    language_style = Column(String(500), nullable=True)
    catchphrases = Column(Text, nullable=True)  # JSON array of catchphrases
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
