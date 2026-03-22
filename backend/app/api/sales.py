from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.sale import Sale
from app.models.product import Product

router = APIRouter(prefix="/sales", tags=["sales"])


class SaleCreate(BaseModel):
    product_id: int
    video_id: Optional[int] = None
    platform: str  # meta, tiktok, whatsapp
    sale_type: Optional[str] = None
    face_id: Optional[str] = None
    script: Optional[str] = None
    video_url: Optional[str] = None


class SaleResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    video_id: Optional[int] = None
    platform: str
    sale_type: Optional[str] = None
    status: str
    campaign_id: Optional[int] = None
    campaign_name: Optional[str] = None
    video_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("", response_model=SaleResponse)
async def create_sale(
    req: SaleCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    # Validate product
    product = db.query(Product).filter(Product.id == req.product_id, Product.user_id == user_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    sale = Sale(
        user_id=user_id,
        product_id=req.product_id,
        video_id=req.video_id,
        platform=req.platform,
        sale_type=req.sale_type,
        face_id=req.face_id,
        script=req.script,
        video_url=req.video_url,
        status="created",
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    return _sale_to_response(sale, db)


@router.get("", response_model=List[SaleResponse])
async def list_sales(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    sales = db.query(Sale).filter(Sale.user_id == user_id).order_by(Sale.created_at.desc()).all()
    return [_sale_to_response(s, db) for s in sales]


@router.get("/{sale_id}", response_model=SaleResponse)
async def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.user_id == user_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda nao encontrada")
    return _sale_to_response(sale, db)


def _sale_to_response(sale: Sale, db: Session) -> dict:
    product = db.query(Product).filter(Product.id == sale.product_id).first()
    return {
        "id": sale.id,
        "product_id": sale.product_id,
        "product_name": product.name if product else None,
        "video_id": sale.video_id,
        "platform": sale.platform,
        "sale_type": sale.sale_type,
        "status": sale.status,
        "campaign_id": sale.campaign_id,
        "campaign_name": sale.campaign_name,
        "video_url": sale.video_url,
        "error_message": sale.error_message,
        "created_at": str(sale.created_at) if sale.created_at else None,
    }
