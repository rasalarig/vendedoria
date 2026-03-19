from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.database import get_db
from app.models.settings import Settings
from app.services.meta_pixel import MetaPixelService

router = APIRouter(prefix="/pixel", tags=["pixel"])


class PixelCreate(BaseModel):
    name: str = "VendedorIA Pixel"


@router.get("")
async def list_pixels(db: Session = Depends(get_db)):
    """List all pixels for the ad account."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token:
        return {"pixels": [], "configured": False, "selected_pixel_id": None}

    service = MetaPixelService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id or "",
    )
    pixels = await service.list_pixels()
    selected = getattr(settings, "meta_pixel_id", None) or ""
    return {"pixels": pixels, "configured": True, "selected_pixel_id": selected}


@router.post("")
async def create_pixel(data: PixelCreate, db: Session = Depends(get_db)):
    """Create a new Meta Pixel."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token:
        raise HTTPException(status_code=400, detail="Meta Ads nao configurado. Conecte sua conta primeiro.")

    service = MetaPixelService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id or "",
    )
    result = await service.create_pixel(data.name)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    # Auto-save as selected pixel
    if result.get("id") and hasattr(settings, "meta_pixel_id"):
        settings.meta_pixel_id = result["id"]
        db.commit()

    return result


@router.get("/{pixel_id}/code")
async def get_pixel_code(pixel_id: str, db: Session = Depends(get_db)):
    """Get JavaScript code snippet for a pixel."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    service = MetaPixelService(
        access_token=(settings.meta_access_token if settings else ""),
        ad_account_id=(settings.meta_ad_account_id if settings else ""),
    )
    return await service.get_pixel_code(pixel_id)


@router.put("/select/{pixel_id}")
async def select_pixel(pixel_id: str, db: Session = Depends(get_db)):
    """Select a pixel as the active pixel for campaigns."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        raise HTTPException(status_code=400, detail="Configuracoes nao encontradas.")
    if hasattr(settings, "meta_pixel_id"):
        settings.meta_pixel_id = pixel_id
        db.commit()
    return {"success": True, "pixel_id": pixel_id}


@router.get("/{pixel_id}/stats")
async def get_pixel_stats(pixel_id: str, db: Session = Depends(get_db)):
    """Get pixel event statistics."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    service = MetaPixelService(
        access_token=(settings.meta_access_token if settings else ""),
        ad_account_id=(settings.meta_ad_account_id if settings else ""),
    )
    return await service.get_pixel_stats(pixel_id)
