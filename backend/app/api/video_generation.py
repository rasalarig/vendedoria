from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.generated_video import GeneratedVideo
from app.models.seller import Seller
from app.models.product import Product
from app.models.reference_video import ReferenceVideo
from app.services.video_generation import VideoGenerationService
from app.services.cost_service import CostService

router = APIRouter(prefix="/creatives", tags=["video-generation"])


# --------------- Request / Response schemas ---------------


class GenerateVideoRequest(BaseModel):
    seller_id: int
    product_id: int
    reference_video_id: Optional[int] = None
    provider: str = Field(default="hailuo", pattern="^(hailuo|runway|heygen)$")
    duration: float = Field(default=10, ge=5, le=60)
    style_tags: Optional[List[str]] = None


class GenerateVideoResponse(BaseModel):
    video_id: int
    script: str
    status: str
    provider: str
    provider_name: str
    duration_seconds: float
    estimated_cost_usd: float
    estimated_cost_brl: float
    mock: bool = True

    class Config:
        from_attributes = True


class CostEstimateResponse(BaseModel):
    provider: str
    provider_name: str
    duration_seconds: float
    estimated_cost_usd: float
    estimated_cost_brl: float


class GeneratedVideoResponse(BaseModel):
    id: int
    seller_id: Optional[int] = None
    product_id: Optional[int] = None
    seller_name: Optional[str] = None
    product_name: Optional[str] = None
    filename: str
    file_size: int
    duration: Optional[float] = None
    status: str
    provider: Optional[str] = None
    cost_usd: Optional[float] = None
    script: Optional[str] = None
    thumbnail_path: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# --------------- Helper ---------------


def _video_to_response(v: GeneratedVideo, db: Session) -> dict:
    """Convert a GeneratedVideo record to a response dict with seller/product names."""
    seller_name = None
    product_name = None
    if v.seller_id:
        seller = db.query(Seller).filter(Seller.id == v.seller_id).first()
        if seller:
            seller_name = seller.name
    if v.product_id:
        product = db.query(Product).filter(Product.id == v.product_id).first()
        if product:
            product_name = product.name
    return {
        "id": v.id,
        "seller_id": v.seller_id,
        "product_id": v.product_id,
        "seller_name": seller_name,
        "product_name": product_name,
        "filename": v.filename or "",
        "file_size": v.file_size or 0,
        "duration": v.duration,
        "status": v.status,
        "provider": v.provider,
        "cost_usd": v.cost_usd,
        "script": v.script,
        "thumbnail_path": v.thumbnail_path,
        "created_at": str(v.created_at) if v.created_at else None,
    }


# --------------- Endpoints ---------------


@router.post("/generate-video", response_model=GenerateVideoResponse)
async def generate_video(
    request: GenerateVideoRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Start video generation: generate script via LLM, create record, log cost."""

    # Validate seller belongs to user
    seller = (
        db.query(Seller)
        .filter(Seller.id == request.seller_id, Seller.user_id == user_id)
        .first()
    )
    if not seller:
        raise HTTPException(status_code=404, detail="Vendedor nao encontrado")

    # Validate product belongs to user
    product = (
        db.query(Product)
        .filter(Product.id == request.product_id, Product.user_id == user_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    # Validate reference video if provided
    reference_video_path = None
    if request.reference_video_id:
        ref_video = (
            db.query(ReferenceVideo)
            .filter(
                ReferenceVideo.id == request.reference_video_id,
                ReferenceVideo.user_id == user_id,
            )
            .first()
        )
        if not ref_video:
            raise HTTPException(status_code=404, detail="Video de referencia nao encontrado")
        reference_video_path = ref_video.filename

    # Initialize service
    try:
        service = VideoGenerationService(provider=request.provider)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Generate script via LLM
    script = await service.generate_script(
        seller=seller,
        product=product,
        style_tags=request.style_tags,
    )

    # Generate video (mock for now)
    result = await service.generate_video(
        script=script,
        seller=seller,
        product=product,
        duration_seconds=request.duration,
        reference_video_path=reference_video_path,
    )

    # Create GeneratedVideo record
    video_record = GeneratedVideo(
        user_id=user_id,
        seller_id=request.seller_id,
        product_id=request.product_id,
        reference_video_id=request.reference_video_id,
        filename=result["filename"],
        file_size=0,  # mock: no actual file yet
        duration=request.duration,
        status=result["status"],
        provider=request.provider,
        cost_usd=result["cost_usd"],
        script=script,
    )
    db.add(video_record)
    db.commit()
    db.refresh(video_record)

    # Log cost
    CostService.log_cost(
        db=db,
        user_id=user_id,
        type="video_generation",
        provider=request.provider,
        amount_usd=result["cost_usd"],
        description=f"Video ad: {product.name} ({request.duration}s via {request.provider})",
        ref_type="generated_video",
        ref_id=video_record.id,
    )

    # Cost estimate for response
    cost_estimate = await service.estimate_cost(request.duration)

    return GenerateVideoResponse(
        video_id=video_record.id,
        script=script,
        status=result["status"],
        provider=request.provider,
        provider_name=result["provider_name"],
        duration_seconds=request.duration,
        estimated_cost_usd=cost_estimate["estimated_cost_usd"],
        estimated_cost_brl=cost_estimate["estimated_cost_brl"],
        mock=result.get("mock", False),
    )


@router.get("/estimate-cost", response_model=CostEstimateResponse)
async def estimate_cost(
    provider: str = Query(default="hailuo", pattern="^(hailuo|runway|heygen)$"),
    duration: float = Query(default=10, ge=5, le=60),
    user_id: int = Depends(get_current_user_id),
):
    """Get cost estimate for video generation."""
    try:
        service = VideoGenerationService(provider=provider)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    estimate = await service.estimate_cost(duration)
    return CostEstimateResponse(**estimate)


@router.get("/generated-videos", response_model=List[GeneratedVideoResponse])
async def list_generated_videos(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """List all generated videos for the current user."""
    videos = (
        db.query(GeneratedVideo)
        .filter(GeneratedVideo.user_id == user_id)
        .order_by(GeneratedVideo.created_at.desc())
        .all()
    )
    return [_video_to_response(v, db) for v in videos]


@router.get("/generated-videos/{video_id}", response_model=GeneratedVideoResponse)
async def get_generated_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Get a single generated video detail."""
    video = (
        db.query(GeneratedVideo)
        .filter(GeneratedVideo.id == video_id, GeneratedVideo.user_id == user_id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video gerado nao encontrado")
    return _video_to_response(video, db)


@router.post("/generated-videos/{video_id}/approve", response_model=GeneratedVideoResponse)
async def approve_generated_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Mark a generated video as approved."""
    video = (
        db.query(GeneratedVideo)
        .filter(GeneratedVideo.id == video_id, GeneratedVideo.user_id == user_id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video gerado nao encontrado")
    video.status = "approved"
    db.commit()
    db.refresh(video)
    return _video_to_response(video, db)


@router.post("/generated-videos/{video_id}/regenerate", response_model=GenerateVideoResponse)
async def regenerate_video(
    video_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Regenerate a video (create a new version with a fresh script)."""
    video = (
        db.query(GeneratedVideo)
        .filter(GeneratedVideo.id == video_id, GeneratedVideo.user_id == user_id)
        .first()
    )
    if not video:
        raise HTTPException(status_code=404, detail="Video gerado nao encontrado")

    # Look up seller and product
    seller = db.query(Seller).filter(Seller.id == video.seller_id).first() if video.seller_id else None
    product = db.query(Product).filter(Product.id == video.product_id).first() if video.product_id else None

    if not seller or not product:
        raise HTTPException(
            status_code=400,
            detail="Vendedor ou produto associado nao encontrado para regenerar",
        )

    provider = video.provider or "hailuo"
    duration = video.duration or 10

    try:
        service = VideoGenerationService(provider=provider)
    except ValueError:
        service = VideoGenerationService(provider="hailuo")

    # Generate new script
    script = await service.generate_script(seller=seller, product=product)

    # Generate video (mock)
    result = await service.generate_video(
        script=script,
        seller=seller,
        product=product,
        duration_seconds=duration,
    )

    # Update existing record
    video.script = script
    video.status = result["status"]
    video.cost_usd = (video.cost_usd or 0) + result["cost_usd"]
    video.filename = result["filename"]
    db.commit()
    db.refresh(video)

    # Log additional cost
    CostService.log_cost(
        db=db,
        user_id=user_id,
        type="video_generation",
        provider=provider,
        amount_usd=result["cost_usd"],
        description=f"Regenerate video ad: {product.name} ({duration}s via {provider})",
        ref_type="generated_video",
        ref_id=video.id,
    )

    cost_estimate = await service.estimate_cost(duration)

    return GenerateVideoResponse(
        video_id=video.id,
        script=script,
        status=result["status"],
        provider=provider,
        provider_name=result["provider_name"],
        duration_seconds=duration,
        estimated_cost_usd=cost_estimate["estimated_cost_usd"],
        estimated_cost_brl=cost_estimate["estimated_cost_brl"],
        mock=result.get("mock", False),
    )
