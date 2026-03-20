from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import os
import shutil
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.product import Product

router = APIRouter(prefix="/products", tags=["products"])

_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_data_dir = "/app/data" if os.path.exists("/app/data") else _backend_dir
UPLOAD_DIR = os.path.join(_data_dir, "uploads")


class ProductResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    target_audience: Optional[str] = None
    differentials: Optional[str] = None
    image_path: Optional[str] = None
    pricing_type: Optional[str] = "one_time"
    recurrence_period: Optional[str] = None
    website_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


def product_to_response(product: Product) -> dict:
    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "target_audience": product.target_audience,
        "differentials": product.differentials,
        "image_path": product.image_path,
        "pricing_type": product.pricing_type or "one_time",
        "recurrence_period": product.recurrence_period,
        "website_url": product.website_url,
        "created_at": str(product.created_at) if product.created_at else None,
        "updated_at": str(product.updated_at) if product.updated_at else None,
    }


@router.post("", response_model=ProductResponse)
async def create_product(
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    target_audience: Optional[str] = Form(None),
    differentials: Optional[str] = Form(None),
    pricing_type: Optional[str] = Form("one_time"),
    recurrence_period: Optional[str] = Form(None),
    website_url: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    image_path = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_path = f"/uploads/{filename}"

    product = Product(
        name=name,
        description=description,
        price=price,
        target_audience=target_audience,
        differentials=differentials,
        image_path=image_path,
        pricing_type=pricing_type or "one_time",
        recurrence_period=recurrence_period,
        website_url=website_url,
        user_id=user_id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product_to_response(product)


@router.get("", response_model=list[ProductResponse])
async def list_products(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    products = db.query(Product).filter(Product.user_id == user_id).order_by(Product.created_at.desc()).all()
    return [product_to_response(p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == user_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")
    return product_to_response(product)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    name: str = Form(...),
    price: float = Form(...),
    description: Optional[str] = Form(None),
    target_audience: Optional[str] = Form(None),
    differentials: Optional[str] = Form(None),
    pricing_type: Optional[str] = Form("one_time"),
    recurrence_period: Optional[str] = Form(None),
    website_url: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == user_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    product.name = name
    product.price = price
    product.description = description
    product.target_audience = target_audience
    product.differentials = differentials
    product.pricing_type = pricing_type or "one_time"
    product.recurrence_period = recurrence_period
    product.website_url = website_url

    if image and image.filename:
        # Remove old image if exists
        if product.image_path:
            old_path = os.path.join(UPLOAD_DIR, os.path.basename(product.image_path))
            if os.path.exists(old_path):
                os.remove(old_path)

        ext = os.path.splitext(image.filename)[1]
        filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(UPLOAD_DIR, filename)
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(image.file, f)
        product.image_path = f"/uploads/{filename}"

    db.commit()
    db.refresh(product)
    return product_to_response(product)


@router.delete("/{product_id}")
async def delete_product(product_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    product = db.query(Product).filter(Product.id == product_id, Product.user_id == user_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    # Remove image file if exists
    if product.image_path:
        filepath = os.path.join(UPLOAD_DIR, os.path.basename(product.image_path))
        if os.path.exists(filepath):
            os.remove(filepath)

    db.delete(product)
    db.commit()
    return {"detail": "Produto removido com sucesso"}
