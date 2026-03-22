from sqlalchemy import Column, Integer, String, DateTime, Float
from sqlalchemy.sql import func
from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    google_id = Column(String(100), unique=True, nullable=True)
    credit_balance_usd = Column(Float, nullable=False, default=1.0, server_default="1.0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
