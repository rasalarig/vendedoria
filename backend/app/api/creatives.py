from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.models.creative import Creative
from app.models.product import Product
from app.models.settings import Settings
from app.services.ai_creative import AICreativeService
from app.services.meta_ads import MetaAdsService

router = APIRouter(prefix="/creatives", tags=["creatives"])


class CreativeResponse(BaseModel):
    id: int
    product_id: int
    variation: int
    headline: Optional[str] = None
    copy_text: Optional[str] = None
    cta: Optional[str] = None
    image_url: Optional[str] = None
    image_prompt: Optional[str] = None
    status: str = "pending"
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


def creative_to_response(c: Creative) -> dict:
    return {
        "id": c.id,
        "product_id": c.product_id,
        "variation": c.variation,
        "headline": c.headline,
        "copy_text": c.copy_text,
        "cta": c.cta,
        "image_url": c.image_url,
        "image_prompt": c.image_prompt,
        "status": c.status,
        "created_at": str(c.created_at) if c.created_at else None,
    }


@router.post("/generate/{product_id}", response_model=List[CreativeResponse])
async def generate_creatives(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    # Get settings for API key and operation mode
    settings = db.query(Settings).filter(Settings.id == 1).first()
    ai_key = ""
    ai_provider = "claude"
    operation_mode = "manual"
    if settings:
        ai_key = settings.ai_api_key or ""
        ai_provider = settings.ai_provider or "claude"
        operation_mode = settings.operation_mode or "manual"

    service = AICreativeService(ai_api_key=ai_key, ai_provider=ai_provider)

    # Generate copy variations
    variations = await service.generate_copy(
        product_name=product.name,
        description=product.description or "",
        price=product.price,
        target_audience=product.target_audience or "",
        differentials=product.differentials or "",
        pricing_type=product.pricing_type or "one_time",
        recurrence_period=product.recurrence_period or "",
    )

    created = []
    for i, var in enumerate(variations[:3], start=1):
        image_prompt = var.get("image_prompt", "")
        image_url = service.generate_image_url(image_prompt) if image_prompt else ""

        status = "approved" if operation_mode == "auto" else "pending"

        creative = Creative(
            product_id=product_id,
            variation=i,
            headline=var.get("headline", ""),
            copy_text=var.get("copy_text", ""),
            cta=var.get("cta", ""),
            image_url=image_url,
            image_prompt=image_prompt,
            status=status,
        )
        db.add(creative)
        db.commit()
        db.refresh(creative)
        created.append(creative_to_response(creative))

    return created


@router.get("", response_model=List[CreativeResponse])
async def list_creatives(product_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Creative)
    if product_id is not None:
        query = query.filter(Creative.product_id == product_id)
    creatives = query.order_by(Creative.created_at.desc()).all()
    return [creative_to_response(c) for c in creatives]


@router.get("/{creative_id}", response_model=CreativeResponse)
async def get_creative(creative_id: int, db: Session = Depends(get_db)):
    creative = db.query(Creative).filter(Creative.id == creative_id).first()
    if not creative:
        raise HTTPException(status_code=404, detail="Criativo nao encontrado")
    return creative_to_response(creative)


@router.put("/{creative_id}/approve", response_model=CreativeResponse)
async def approve_creative(creative_id: int, db: Session = Depends(get_db)):
    creative = db.query(Creative).filter(Creative.id == creative_id).first()
    if not creative:
        raise HTTPException(status_code=404, detail="Criativo nao encontrado")
    creative.status = "approved"
    db.commit()
    db.refresh(creative)
    return creative_to_response(creative)


@router.put("/{creative_id}/reject", response_model=CreativeResponse)
async def reject_creative(creative_id: int, db: Session = Depends(get_db)):
    creative = db.query(Creative).filter(Creative.id == creative_id).first()
    if not creative:
        raise HTTPException(status_code=404, detail="Criativo nao encontrado")
    creative.status = "rejected"
    db.commit()
    db.refresh(creative)
    return creative_to_response(creative)


@router.post("/{creative_id}/regenerate", response_model=CreativeResponse)
async def regenerate_creative(creative_id: int, db: Session = Depends(get_db)):
    creative = db.query(Creative).filter(Creative.id == creative_id).first()
    if not creative:
        raise HTTPException(status_code=404, detail="Criativo nao encontrado")

    product = db.query(Product).filter(Product.id == creative.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    settings = db.query(Settings).filter(Settings.id == 1).first()
    ai_key = ""
    ai_provider = "claude"
    operation_mode = "manual"
    if settings:
        ai_key = settings.ai_api_key or ""
        ai_provider = settings.ai_provider or "claude"
        operation_mode = settings.operation_mode or "manual"

    service = AICreativeService(ai_api_key=ai_key, ai_provider=ai_provider)

    variations = await service.generate_copy(
        product_name=product.name,
        description=product.description or "",
        price=product.price,
        target_audience=product.target_audience or "",
        differentials=product.differentials or "",
        pricing_type=product.pricing_type or "one_time",
        recurrence_period=product.recurrence_period or "",
    )

    # Pick variation based on creative's variation number (0-indexed)
    idx = max(0, min(creative.variation - 1, len(variations) - 1))
    var = variations[idx]

    image_prompt = var.get("image_prompt", "")
    image_url = service.generate_image_url(image_prompt) if image_prompt else ""

    creative.headline = var.get("headline", "")
    creative.copy_text = var.get("copy_text", "")
    creative.cta = var.get("cta", "")
    creative.image_url = image_url
    creative.image_prompt = image_prompt
    creative.status = "approved" if operation_mode == "auto" else "pending"

    db.commit()
    db.refresh(creative)
    return creative_to_response(creative)


@router.post("/upload-image")
async def upload_ad_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload an image to Meta Ads and return the image_hash."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token or not settings.meta_ad_account_id:
        raise HTTPException(status_code=400, detail="Meta Ads nao configurado.")

    meta_service = MetaAdsService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id,
    )
    image_bytes = await file.read()
    result = await meta_service.upload_image(image_bytes, file.filename)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    return result


@router.delete("/{creative_id}")
async def delete_creative(creative_id: int, db: Session = Depends(get_db)):
    creative = db.query(Creative).filter(Creative.id == creative_id).first()
    if not creative:
        raise HTTPException(status_code=404, detail="Criativo nao encontrado")
    db.delete(creative)
    db.commit()
    return {"detail": "Criativo removido com sucesso"}
