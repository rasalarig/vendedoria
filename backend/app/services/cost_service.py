from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models.cost_log import CostLog


class CostService:
    """Service for tracking and estimating generation costs."""

    # Provider costs per second/unit
    PROVIDER_COSTS = {
        "hailuo": {"video_per_second": 0.084, "min_duration": 5},
        "runway": {"video_per_second": 0.05, "min_duration": 5},
        "heygen": {"video_per_second": 0.10, "min_duration": 5},
        "flux": {"image_per_unit": 0.04},
        "together": {"image_per_unit": 0.01},
    }

    @staticmethod
    def estimate_cost(provider: str, type: str, duration_seconds: float = 5) -> dict:
        """Estimate cost before generating.

        Returns dict with estimated_usd, provider, type, and breakdown.
        """
        costs = CostService.PROVIDER_COSTS.get(provider)
        if not costs:
            return {
                "estimated_usd": 0.0,
                "provider": provider,
                "type": type,
                "breakdown": f"Unknown provider: {provider}",
            }

        if "video_per_second" in costs:
            min_dur = costs.get("min_duration", 5)
            effective_duration = max(duration_seconds, min_dur)
            estimated = round(costs["video_per_second"] * effective_duration, 4)
            breakdown = (
                f"{effective_duration}s x ${costs['video_per_second']}/s"
            )
        elif "image_per_unit" in costs:
            estimated = round(costs["image_per_unit"], 4)
            breakdown = f"1 image x ${costs['image_per_unit']}/unit"
        else:
            estimated = 0.0
            breakdown = "No pricing info"

        return {
            "estimated_usd": estimated,
            "provider": provider,
            "type": type,
            "breakdown": breakdown,
        }

    @staticmethod
    def log_cost(
        db: Session,
        user_id: int,
        type: str,
        provider: str,
        amount_usd: float,
        description: str = "",
        ref_type: Optional[str] = None,
        ref_id: Optional[int] = None,
    ) -> CostLog:
        """Log an actual cost after generation."""
        entry = CostLog(
            user_id=user_id,
            type=type,
            provider=provider,
            amount_usd=amount_usd,
            description=description,
            reference_type=ref_type,
            reference_id=ref_id,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

    @staticmethod
    def get_summary(db: Session, user_id: int, days: int = 30) -> dict:
        """Get cost summary for user: total, by provider, by type."""
        since = datetime.now(timezone.utc) - timedelta(days=days)

        base_q = db.query(CostLog).filter(
            CostLog.user_id == user_id,
            CostLog.created_at >= since,
        )

        # Total
        total = base_q.with_entities(
            sql_func.coalesce(sql_func.sum(CostLog.amount_usd), 0.0)
        ).scalar()

        # By provider
        by_provider_rows = (
            base_q.with_entities(
                CostLog.provider,
                sql_func.sum(CostLog.amount_usd).label("total"),
                sql_func.count(CostLog.id).label("count"),
            )
            .group_by(CostLog.provider)
            .all()
        )
        by_provider = {
            row.provider: {"total_usd": round(row.total, 4), "count": row.count}
            for row in by_provider_rows
        }

        # By type
        by_type_rows = (
            base_q.with_entities(
                CostLog.type,
                sql_func.sum(CostLog.amount_usd).label("total"),
                sql_func.count(CostLog.id).label("count"),
            )
            .group_by(CostLog.type)
            .all()
        )
        by_type = {
            row.type: {"total_usd": round(row.total, 4), "count": row.count}
            for row in by_type_rows
        }

        return {
            "days": days,
            "total_usd": round(total, 4),
            "by_provider": by_provider,
            "by_type": by_type,
        }

    @staticmethod
    def get_user_total(db: Session, user_id: int) -> float:
        """Get all-time total for user."""
        total = (
            db.query(sql_func.coalesce(sql_func.sum(CostLog.amount_usd), 0.0))
            .filter(CostLog.user_id == user_id)
            .scalar()
        )
        return round(total, 4)
