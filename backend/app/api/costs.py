from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.services.cost_service import CostService

router = APIRouter(prefix="/costs", tags=["costs"])


# --------------- Pydantic Schemas ---------------

class CostEstimateResponse(BaseModel):
    estimated_usd: float
    provider: str
    type: str
    breakdown: str


class ProviderBreakdown(BaseModel):
    total_usd: float
    count: int


class CostSummaryResponse(BaseModel):
    days: int
    total_usd: float
    by_provider: dict
    by_type: dict


class CostLogResponse(BaseModel):
    id: int
    user_id: int
    type: str
    provider: str
    amount_usd: float
    description: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# --------------- Endpoints ---------------

@router.get("/estimate", response_model=CostEstimateResponse)
def estimate_cost(
    provider: str = Query(..., description="Provider name (veo3, flux, together)"),
    type: str = Query(..., description="Generation type (video_generation, image_generation, tts)"),
    duration: float = Query(5, description="Duration in seconds (for video providers)"),
):
    """Estimate cost before generating. No authentication required."""
    result = CostService.estimate_cost(provider=provider, type=type, duration_seconds=duration)
    return result


@router.get("/summary", response_model=CostSummaryResponse)
def get_cost_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to summarize"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get cost summary for authenticated user."""
    return CostService.get_summary(db=db, user_id=user_id, days=days)


@router.get("/history", response_model=List[CostLogResponse])
def get_cost_history(
    limit: int = Query(50, ge=1, le=500, description="Number of entries to return"),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get recent cost log entries for authenticated user."""
    from app.models.cost_log import CostLog

    entries = (
        db.query(CostLog)
        .filter(CostLog.user_id == user_id)
        .order_by(CostLog.created_at.desc())
        .limit(limit)
        .all()
    )

    # Convert datetime to string for response
    results = []
    for entry in entries:
        results.append(CostLogResponse(
            id=entry.id,
            user_id=entry.user_id,
            type=entry.type,
            provider=entry.provider,
            amount_usd=entry.amount_usd,
            description=entry.description,
            reference_type=entry.reference_type,
            reference_id=entry.reference_id,
            created_at=entry.created_at.isoformat() if entry.created_at else None,
        ))
    return results
