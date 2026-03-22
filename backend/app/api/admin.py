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
from app.models.user import User
from app.services.currency import get_usd_brl_rate

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/platform-status")
def get_platform_status(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get status of all paid platform integrations."""
    # Fetch exchange rate
    exchange_info = get_usd_brl_rate()
    rate = exchange_info["rate"]

    platforms = []

    # 1. Together AI (LLM for scripts)
    together_key = settings.TOGETHER_API_KEY or os.environ.get("TOGETHER_API_KEY", "")
    together_configured = bool(together_key and together_key != "")
    # Count scripts generated (each video has a script, plus standalone scripts)
    # Use cost_logs if available, otherwise estimate from generated videos
    llm_cost_logs = (
        db.query(func.coalesce(func.sum(CostLog.amount_usd), 0))
        .filter(CostLog.type.in_(["script_generation", "script_refine", "chat"]))
        .scalar()
        or 0
    )
    llm_log_count = (
        db.query(func.count(CostLog.id))
        .filter(CostLog.type.in_(["script_generation", "script_refine", "chat"]))
        .scalar()
        or 0
    )
    # If cost_logs are empty, estimate from generated videos (each video had a script)
    total_videos = (
        db.query(func.count(GeneratedVideo.id)).scalar() or 0
    )
    llm_spent = float(llm_cost_logs) if float(llm_cost_logs) > 0 else total_videos * 0.0014
    llm_count = int(llm_log_count) if int(llm_log_count) > 0 else total_videos
    platforms.append(
        {
            "id": "together_ai",
            "name": "Together AI (LLM)",
            "description": "Geracao de roteiros e chat IA",
            "icon": "psychology",
            "configured": together_configured,
            "api_key_set": together_configured,
            "total_spent_usd": round(llm_spent, 4),
            "total_spent_brl": round(llm_spent * rate, 4),
            "total_requests": llm_count,
            "cost_per_request_usd": 0.0014,
            "cost_per_request_brl": round(0.0014 * rate, 4),
            "role_description": "Cerebro da IA: gera roteiros de video, textos de anuncio e responde no chat. Cada mensagem ou geracao de conteudo consome creditos.",
            "alert_level": "ok",
            "alert_message": None,
        }
    )

    # 2. Google Veo 3 (Video Generation)
    # Use actual cost from generated_videos table (more reliable than cost_logs)
    veo_spent_from_videos = (
        db.query(func.coalesce(func.sum(GeneratedVideo.cost_usd), 0))
        .filter(GeneratedVideo.provider == "veo3")
        .scalar()
        or 0
    )
    veo_spent_from_logs = (
        db.query(func.coalesce(func.sum(CostLog.amount_usd), 0))
        .filter(CostLog.type == "video_generation")
        .scalar()
        or 0
    )
    # Use whichever source has data
    veo_spent = max(float(veo_spent_from_videos), float(veo_spent_from_logs))
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
            "total_spent_usd": round(veo_spent, 4),
            "total_spent_brl": round(veo_spent * rate, 4),
            "total_requests": int(veo_count),
            "cost_per_request_usd": 0.50,
            "cost_per_request_brl": round(0.50 * rate, 4),
            "videos_generated": int(veo_count),
            "role_description": "Geracao de videos com IA: transforma roteiros em videos de vendas para seus produtos. Cada video gerado consome creditos.",
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
            "total_revenue_brl": round(float(stripe_revenue) * rate, 2),
            "total_transactions": int(stripe_count),
            "total_user_balance_usd": round(float(total_user_balance), 2),
            "total_user_balance_brl": round(float(total_user_balance) * rate, 2),
            "role_description": "Gateway de pagamentos: processa compras de creditos dos usuarios. Mostra receita total, transacoes e saldo disponivel dos usuarios.",
            "alert_level": "ok" if stripe_configured else "critical",
            "alert_message": None if stripe_configured else "Stripe nao configurado",
        }
    )

    # 4. Bonus given to users (platform cost)
    bonus_total = float(
        db.query(func.coalesce(func.sum(CreditTransaction.amount_usd), 0))
        .filter(CreditTransaction.type == "bonus")
        .scalar() or 0
    )

    # 5. Summary
    total_platform_spend = round(float(llm_spent) + float(veo_spent), 4)
    revenue = round(float(stripe_revenue), 2)
    total_cost = total_platform_spend + bonus_total
    profit = round(revenue - total_cost, 2)

    return {
        "platforms": platforms,
        "summary": {
            "total_platform_cost_usd": total_platform_spend,
            "total_platform_cost_brl": round(total_platform_spend * rate, 2),
            "total_bonus_usd": round(bonus_total, 2),
            "total_bonus_brl": round(bonus_total * rate, 2),
            "total_cost_usd": round(total_cost, 2),
            "total_cost_brl": round(total_cost * rate, 2),
            "total_revenue_usd": revenue,
            "total_revenue_brl": round(revenue * rate, 2),
            "profit_usd": profit,
            "profit_brl": round(profit * rate, 2),
            "total_users": db.query(func.count(User.id)).scalar() or 0,
            "total_user_balance_usd": round(float(total_user_balance), 2),
            "total_user_balance_brl": round(float(total_user_balance) * rate, 2),
        },
        "exchange_rate": {
            "usd_brl": exchange_info["rate"],
            "source": exchange_info["source"],
            "updated_at": exchange_info["updated_at"],
        },
    }


@router.get("/users")
def get_users(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """List all users."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return {
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "credit_balance_usd": round(float(u.credit_balance_usd or 0), 2),
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
        "total": len(users),
    }


@router.get("/cost-breakdown")
def get_cost_breakdown(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Detailed cost breakdown by service, revenue transactions and profit."""
    # Fetch exchange rate
    rate_info = get_usd_brl_rate()
    rate = rate_info["rate"]

    # Together AI costs
    llm_cost_logs = (
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
    total_videos = db.query(func.count(GeneratedVideo.id)).scalar() or 0
    together_cost_usd = float(llm_cost_logs) if float(llm_cost_logs) > 0 else total_videos * 0.0014
    together_requests = int(llm_count) if int(llm_count) > 0 else total_videos

    # Veo 3 costs
    veo_from_videos = float(
        db.query(func.coalesce(func.sum(GeneratedVideo.cost_usd), 0))
        .filter(GeneratedVideo.provider == "veo3")
        .scalar()
        or 0
    )
    veo_from_logs = float(
        db.query(func.coalesce(func.sum(CostLog.amount_usd), 0))
        .filter(CostLog.type == "video_generation")
        .scalar()
        or 0
    )
    veo_cost_usd = max(veo_from_videos, veo_from_logs)
    veo_count = (
        db.query(func.count(GeneratedVideo.id))
        .filter(GeneratedVideo.provider == "veo3")
        .scalar()
        or 0
    )

    # Revenue (Stripe)
    revenue_usd = float(
        db.query(func.coalesce(func.sum(CreditTransaction.amount_usd), 0))
        .filter(CreditTransaction.type == "purchase")
        .scalar()
        or 0
    )
    revenue_count = (
        db.query(func.count(CreditTransaction.id))
        .filter(CreditTransaction.type == "purchase")
        .scalar()
        or 0
    )

    # Recent transactions (last 20)
    recent_transactions = (
        db.query(CreditTransaction)
        .filter(CreditTransaction.type == "purchase")
        .order_by(CreditTransaction.created_at.desc())
        .limit(20)
        .all()
    )

    # Bonus given to users
    bonus_total = float(
        db.query(func.coalesce(func.sum(CreditTransaction.amount_usd), 0))
        .filter(CreditTransaction.type == "bonus")
        .scalar() or 0
    )
    bonus_count = db.query(func.count(CreditTransaction.id)).filter(CreditTransaction.type == "bonus").scalar() or 0
    recent_bonuses = (
        db.query(CreditTransaction)
        .filter(CreditTransaction.type == "bonus")
        .order_by(CreditTransaction.created_at.desc())
        .limit(20)
        .all()
    )

    total_cost_usd = together_cost_usd + veo_cost_usd + bonus_total
    profit_usd = revenue_usd - total_cost_usd

    return {
        "cost_breakdown": {
            "together_ai": {
                "name": "Together AI (LLM)",
                "cost_usd": round(together_cost_usd, 4),
                "cost_brl": round(together_cost_usd * rate, 2),
                "requests": together_requests,
                "cost_per_request_usd": 0.0014,
                "detail": f"{together_requests} requests x ~US$ 0,0014 = US$ {together_cost_usd:.4f}",
            },
            "veo3": {
                "name": "Google Veo 3",
                "cost_usd": round(veo_cost_usd, 4),
                "cost_brl": round(veo_cost_usd * rate, 2),
                "videos": int(veo_count),
                "cost_per_video_usd": 0.50,
                "detail": f"{int(veo_count)} videos x US$ 0,50 = US$ {veo_cost_usd:.2f}",
            },
            "bonus": {
                "total_usd": round(bonus_total, 2),
                "total_brl": round(bonus_total * rate, 2),
                "total_grants": bonus_count,
                "detail": f"{bonus_count} bonus concedidos = US$ {bonus_total:.2f}",
                "recent": [
                    {
                        "id": b.id,
                        "amount_usd": round(float(b.amount_usd or 0), 2),
                        "amount_brl": round(float(b.amount_usd or 0) * rate, 2),
                        "created_at": b.created_at.isoformat() if b.created_at else None,
                    }
                    for b in recent_bonuses
                ],
            },
            "total_usd": round(total_cost_usd, 4),
            "total_brl": round(total_cost_usd * rate, 2),
        },
        "revenue": {
            "total_usd": round(revenue_usd, 2),
            "total_brl": round(revenue_usd * rate, 2),
            "total_transactions": revenue_count,
            "recent": [
                {
                    "id": t.id,
                    "amount_usd": round(float(t.amount_usd or 0), 2),
                    "amount_brl": round(float(t.amount_usd or 0) * rate, 2),
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in recent_transactions
            ],
        },
        "profit": {
            "revenue_usd": round(revenue_usd, 2),
            "platform_cost_usd": round(together_cost_usd + veo_cost_usd, 4),
            "bonus_usd": round(bonus_total, 2),
            "total_cost_usd": round(total_cost_usd, 2),
            "profit_usd": round(profit_usd, 2),
            "revenue_brl": round(revenue_usd * rate, 2),
            "platform_cost_brl": round((together_cost_usd + veo_cost_usd) * rate, 2),
            "bonus_brl": round(bonus_total * rate, 2),
            "total_cost_brl": round(total_cost_usd * rate, 2),
            "profit_brl": round(profit_usd * rate, 2),
        },
        "exchange_rate": rate_info,
    }
