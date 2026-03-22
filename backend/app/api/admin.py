import os

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_id
from app.core.config import settings
from app.core.database import get_db
from app.models.cost_log import CostLog
from app.models.credit_transaction import CreditTransaction
from app.models.generated_video import GeneratedVideo
from app.models.settings import Settings as UserSettings
from app.models.user import User

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/platform-status")
def get_platform_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get status of all paid platform integrations."""
    platforms = []

    # 1. Together AI (LLM for scripts)
    together_key = settings.TOGETHER_API_KEY or os.environ.get("TOGETHER_API_KEY", "")
    together_configured = bool(together_key and together_key != "")
    llm_spent = (
        db.query(func.coalesce(func.sum(CostLog.amount_usd), 0))
        .filter(CostLog.type.in_(["script_generation", "script_refine", "chat"]))
        .scalar()
        or 0
    )
    llm_count = (
        db.query(func.count(CostLog.id))
        .filter(CostLog.type.in_(["script_generation", "script_refine", "chat"]))
        .scalar()
        or 0
    )
    platforms.append(
        {
            "id": "together_ai",
            "name": "Together AI (LLM)",
            "description": "Geracao de roteiros e chat IA",
            "icon": "psychology",
            "configured": together_configured,
            "api_key_set": together_configured,
            "total_spent_usd": round(float(llm_spent), 4),
            "total_requests": int(llm_count),
            "cost_per_request_usd": 0.01,
            "alert_level": "ok",
            "alert_message": None,
        }
    )

    # 2. Google Veo 3 (Video Generation)
    veo_spent = (
        db.query(func.coalesce(func.sum(CostLog.amount_usd), 0))
        .filter(CostLog.type == "video_generation")
        .scalar()
        or 0
    )
    veo_count = (
        db.query(func.count(GeneratedVideo.id))
        .filter(GeneratedVideo.provider == "veo3")
        .scalar()
        or 0
    )
    platforms.append(
        {
            "id": "veo3",
            "name": "Google Veo 3",
            "description": "Geracao de videos com IA",
            "icon": "movie_creation",
            "configured": True,
            "api_key_set": True,
            "total_spent_usd": round(float(veo_spent), 4),
            "total_requests": int(veo_count),
            "cost_per_request_usd": 0.50,
            "videos_generated": int(veo_count),
            "alert_level": "ok",
            "alert_message": None,
        }
    )

    # 3. Stripe (Payment Processing)
    stripe_configured = bool(settings.STRIPE_SECRET_KEY)
    stripe_revenue = (
        db.query(func.coalesce(func.sum(CreditTransaction.amount_usd), 0))
        .filter(CreditTransaction.type == "purchase")
        .scalar()
        or 0
    )
    stripe_count = (
        db.query(func.count(CreditTransaction.id))
        .filter(CreditTransaction.type == "purchase")
        .scalar()
        or 0
    )
    total_user_balance = (
        db.query(func.coalesce(func.sum(User.credit_balance_usd), 0)).scalar() or 0
    )
    platforms.append(
        {
            "id": "stripe",
            "name": "Stripe",
            "description": "Processamento de pagamentos",
            "icon": "payments",
            "configured": stripe_configured,
            "api_key_set": stripe_configured,
            "total_revenue_usd": round(float(stripe_revenue), 2),
            "total_transactions": int(stripe_count),
            "total_user_balance_usd": round(float(total_user_balance), 2),
            "alert_level": "ok" if stripe_configured else "critical",
            "alert_message": None if stripe_configured else "Stripe nao configurado",
        }
    )

    # 4. Meta Ads
    user_settings = (
        db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    )
    meta_configured = bool(user_settings and user_settings.meta_access_token)
    platforms.append(
        {
            "id": "meta_ads",
            "name": "Meta Ads",
            "description": "Facebook + Instagram Ads",
            "icon": "campaign",
            "configured": meta_configured,
            "api_key_set": meta_configured,
            "account_status": "connected" if meta_configured else "not_connected",
            "alert_level": "ok" if meta_configured else "warning",
            "alert_message": None
            if meta_configured
            else "Conta Meta nao conectada",
        }
    )

    # 5. Summary
    total_platform_spend = round(float(llm_spent) + float(veo_spent), 4)

    return {
        "platforms": platforms,
        "summary": {
            "total_platform_cost_usd": total_platform_spend,
            "total_revenue_usd": round(float(stripe_revenue), 2),
            "profit_usd": round(float(stripe_revenue) - total_platform_spend, 2),
            "total_users": db.query(func.count(User.id)).scalar() or 0,
            "total_user_balance_usd": round(float(total_user_balance), 2),
        },
    }
