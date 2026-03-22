import types
import os
import shutil
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File as FastAPIFile
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
from app.models.user import User

router = APIRouter(prefix="/creatives", tags=["video-generation"])


# --------------- Request / Response schemas ---------------


class GenerateScriptRequest(BaseModel):
    product_id: int
    face_url: Optional[str] = None
    style: Optional[str] = None  # Personality style: formal, funny, technical, motivational, young
    duration: float = Field(default=10, ge=5, le=60)  # Video duration in seconds


class GenerateScriptResponse(BaseModel):
    script: str


class GenerateVideoRequest(BaseModel):
    seller_id: Optional[int] = None
    product_id: int
    reference_video_id: Optional[int] = None
    provider: str = Field(default="veo3")
    duration: float = Field(default=10, ge=5, le=60)
    style_tags: Optional[List[str]] = None
    face_url: Optional[str] = None
    script: Optional[str] = None  # Pre-approved script, skip generation if provided
    image_urls: Optional[List[str]] = None  # Additional images for the video


class GenerateVideoResponse(BaseModel):
    video_id: int
    script: str
    status: str
    provider: str
    provider_name: str
    duration_seconds: float
    estimated_cost_usd: float
    estimated_cost_brl: float
    video_url: Optional[str] = None
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


@router.post("/script/generate", response_model=GenerateScriptResponse)
async def generate_script(
    request: GenerateScriptRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Generate just the script via LLM without creating a video."""
    product = (
        db.query(Product)
        .filter(Product.id == request.product_id, Product.user_id == user_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    seller = types.SimpleNamespace(
        name='Apresentador', personality=request.style or 'informal',
        language_style='', catchphrases='',
        face_url=request.face_url, thumbnail_url=request.face_url,
    )

    service = VideoGenerationService()
    try:
        script = await service.generate_script(seller=seller, product=product, style=request.style, duration_seconds=request.duration)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return GenerateScriptResponse(script=script)


class RefineScriptRequest(BaseModel):
    product_id: int
    current_script: str
    instruction: str
    style: Optional[str] = None


class RefineScriptResponse(BaseModel):
    script: str


@router.post("/script/refine", response_model=RefineScriptResponse)
async def refine_script(
    request: RefineScriptRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Refine an existing script based on user instructions."""
    product = (
        db.query(Product)
        .filter(Product.id == request.product_id, Product.user_id == user_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    service = VideoGenerationService()
    try:
        new_script = await service.refine_script(
            current_script=request.current_script,
            instruction=request.instruction,
            product=product,
            style=request.style,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return RefineScriptResponse(script=new_script)


@router.post("/generate-video", response_model=GenerateVideoResponse)
async def generate_video(
    request: GenerateVideoRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Start video generation: generate script via LLM, create record, log cost."""

    # Validate seller belongs to user (optional now)
    seller = None
    if request.seller_id:
        seller = (
            db.query(Seller)
            .filter(Seller.id == request.seller_id, Seller.user_id == user_id)
            .first()
        )
    # Use a default seller object if none provided/found
    if not seller:
        seller = types.SimpleNamespace(
            name='Apresentador', personality='informal',
            language_style='', catchphrases='',
            face_url=request.face_url,
            thumbnail_url=request.face_url,
        )
    elif request.face_url:
        # Attach face_url to existing seller object for Veo 3 actor photo
        seller.face_url = request.face_url
        seller.thumbnail_url = request.face_url

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

    # Check credit balance
    user_obj = db.query(User).filter(User.id == user_id).first()
    if user_obj and (user_obj.credit_balance_usd or 0) < 0.01:
        raise HTTPException(
            status_code=402,
            detail="Creditos insuficientes. Adicione creditos para continuar gerando videos."
        )

    # Initialize service
    service = VideoGenerationService()

    try:
        # Use pre-approved script if provided, otherwise generate via LLM
        if request.script:
            script = request.script
        else:
            script = await service.generate_script(
                seller=seller,
                product=product,
                style_tags=request.style_tags,
                duration_seconds=request.duration,
            )

        # Generate video
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
            file_size=result.get("file_size", 0),
            duration=request.duration,
            status=result["status"],
            provider="veo3",
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
            provider="veo3",
            amount_usd=result["cost_usd"],
            description=f"Video ad: {product.name} ({request.duration}s via Google Veo 3)",
            ref_type="generated_video",
            ref_id=video_record.id,
        )

        # Cost estimate for response
        cost_estimate = await service.estimate_cost(request.duration)

        # Build video URL for the frontend
        video_url = None
        if result.get("file_path"):
            video_url = result["file_path"]  # e.g. /uploads/videos/generated/veo3_xxx.mp4

        return GenerateVideoResponse(
            video_id=video_record.id,
            script=script,
            status=result["status"],
            provider="veo3",
            provider_name=result["provider_name"],
            duration_seconds=request.duration,
            estimated_cost_usd=cost_estimate["estimated_cost_usd"],
            estimated_cost_brl=cost_estimate["estimated_cost_brl"],
            video_url=video_url,
            mock=result.get("mock", False),
        )
    except HTTPException:
        raise  # re-raise HTTP exceptions as-is
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/estimate-cost", response_model=CostEstimateResponse)
async def estimate_cost(
    provider: str = Query(default="veo3"),
    duration: float = Query(default=10, ge=5, le=60),
    user_id: int = Depends(get_current_user_id),
):
    """Get cost estimate for video generation."""
    service = VideoGenerationService()
    estimate = await service.estimate_cost(duration)
    return CostEstimateResponse(**estimate)


@router.get("/generated-videos", response_model=List[GeneratedVideoResponse])
async def list_generated_videos(
    product_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """List all generated videos for the current user, optionally filtered by product."""
    query = db.query(GeneratedVideo).filter(GeneratedVideo.user_id == user_id)
    if product_id:
        query = query.filter(GeneratedVideo.product_id == product_id)
    videos = query.order_by(GeneratedVideo.created_at.desc()).all()
    return [_video_to_response(v, db) for v in videos]


@router.post("/upload-video", response_model=GeneratedVideoResponse)
async def upload_video(
    product_id: int = Query(...),
    file: UploadFile = FastAPIFile(...),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    """Upload a custom video file for a product."""
    # Validate product
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == user_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    # Save file
    upload_dir = os.path.join("uploads", "videos", "custom")
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"custom_{uuid.uuid4().hex[:12]}_{file.filename}"
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_size = os.path.getsize(filepath)

    video_record = GeneratedVideo(
        user_id=user_id,
        product_id=product_id,
        filename=filename,
        file_size=file_size,
        status="uploaded",
        provider="custom",
        cost_usd=0,
        script="Video enviado pelo usuario",
    )
    db.add(video_record)
    db.commit()
    db.refresh(video_record)

    return _video_to_response(video_record, db)


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

    if not product:
        raise HTTPException(
            status_code=400,
            detail="Produto associado nao encontrado para regenerar",
        )

    # Use a default seller object if none found
    if not seller:
        seller = types.SimpleNamespace(
            name='Apresentador', personality='informal',
            language_style='', catchphrases=''
        )

    provider = "veo3"
    duration = video.duration or 10
    service = VideoGenerationService()

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
        description=f"Regenerate video ad: {product.name} ({duration}s via Google Veo 3)",
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
