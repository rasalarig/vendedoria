from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.core.database import Base


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    amount_usd = Column(Float, nullable=False)  # positive = credit, negative = debit
    type = Column(String(50), nullable=False)  # "purchase", "bonus", "deduction", "refund"
    description = Column(String(500), nullable=True)
    stripe_session_id = Column(String(200), nullable=True)
    stripe_payment_intent = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
