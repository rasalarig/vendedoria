from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import json
import logging
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.sale import Sale
from app.models.product import Product
from app.models.settings import Settings
from app.models.campaign import Campaign
from app.services.meta_ads import MetaAdsService

logger = logging.getLogger(__name__)

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

    # Auto-create campaign based on platform
    if req.platform == "meta":
        await _create_meta_campaign(sale, product, req, user_id, db)
    elif req.platform == "tiktok":
        await _create_tiktok_campaign(sale, product, req, db)

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


@router.post("/{sale_id}/retry-campaign", response_model=SaleResponse)
async def retry_campaign(
    sale_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.user_id == user_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda nao encontrada")

    if sale.campaign_id:
        # Allow retry if existing campaign has error/non-active status
        existing_campaign = db.query(Campaign).filter(Campaign.id == sale.campaign_id).first()
        non_retryable = {'active', 'mock'}
        if existing_campaign and existing_campaign.status not in non_retryable:
            # Delete the failed campaign to retry fresh
            db.delete(existing_campaign)
            sale.campaign_id = None
            sale.campaign_name = None
            sale.status = 'created'
            sale.error_message = None
            db.commit()
        elif not existing_campaign:
            # Campaign record missing, allow retry
            sale.campaign_id = None
            sale.campaign_name = None
            sale.status = 'created'
            sale.error_message = None
            db.commit()
        else:
            raise HTTPException(status_code=400, detail="Esta venda ja possui uma campanha ativa vinculada")

    product = db.query(Product).filter(Product.id == sale.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    req = SaleCreate(
        product_id=sale.product_id,
        platform=sale.platform,
        sale_type=sale.sale_type,
        script=sale.script,
        video_url=sale.video_url,
    )

    if sale.platform == "meta":
        await _create_meta_campaign(sale, product, req, user_id, db)
    elif sale.platform == "tiktok":
        await _create_tiktok_campaign(sale, product, req, db)

    return _sale_to_response(sale, db)


@router.get("/{sale_id}/detail")
async def get_sale_detail(
    sale_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.user_id == user_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Venda nao encontrada")

    product = db.query(Product).filter(Product.id == sale.product_id).first()

    # Get linked campaign
    campaign_data = None
    if sale.campaign_id:
        from app.models.campaign import Campaign
        campaign = db.query(Campaign).filter(Campaign.id == sale.campaign_id).first()
        if campaign:
            campaign_data = {
                "id": campaign.id,
                "name": campaign.name,
                "status": campaign.status,
                "objective": campaign.objective,
                "meta_campaign_id": campaign.meta_campaign_id,
                "meta_ad_id": campaign.meta_ad_id,
                "daily_budget": campaign.daily_budget,
                "total_budget": campaign.total_budget,
                "spent": campaign.spent,
                "impressions": campaign.impressions,
                "clicks": campaign.clicks,
                "conversions": campaign.conversions,
                "leads": campaign.leads,
                "ctr": campaign.ctr,
                "cpc": campaign.cpc,
                "cpl": campaign.cpl,
                "targeting": campaign.targeting,
                "created_at": str(campaign.created_at) if campaign.created_at else None,
            }

    return {
        "id": sale.id,
        "product_id": sale.product_id,
        "product_name": product.name if product else None,
        "product_image": product.image_url if product and hasattr(product, 'image_url') else None,
        "platform": sale.platform,
        "sale_type": sale.sale_type,
        "status": sale.status,
        "script": sale.script,
        "video_url": sale.video_url,
        "campaign_id": sale.campaign_id,
        "campaign_name": sale.campaign_name,
        "error_message": sale.error_message,
        "created_at": str(sale.created_at) if sale.created_at else None,
        "campaign": campaign_data,
    }


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


async def _create_meta_campaign(
    sale: Sale, product: Product, req: SaleCreate, user_id: int, db: Session
) -> None:
    """Auto-create a Meta Ads campaign after sale creation."""
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings or not settings.meta_access_token or not settings.meta_ad_account_id:
        # Meta credentials not configured yet; leave sale as "created"
        logger.info("Meta credentials missing for user %s, skipping campaign creation", user_id)
        return

    meta_service = MetaAdsService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id,
        page_id=settings.facebook_page_id or "",
    )

    targeting = meta_service.suggest_targeting(
        product.name, product.target_audience or "", product.price
    )

    ad_message = req.script or f"Conheca {product.name}! {product.description or ''}"
    ad_headline = product.name
    ad_image_url = product.image_path or ""
    ad_link = product.website_url or "https://example.com"

    try:
        full_result = await meta_service.create_full_campaign(
            campaign_name=f"Campanha - {product.name}",
            targeting=targeting,
            daily_budget=50,
            ad_message=ad_message,
            ad_headline=ad_headline,
            ad_image_url=ad_image_url,
            ad_cta="LEARN_MORE",
            ad_link=ad_link,
        )

        campaign_status = "active"
        if full_result.get("errors"):
            campaign_status = "error"
        elif full_result.get("is_mock"):
            campaign_status = "mock"

        # Collect warnings (non-blocking issues like missing images)
        warnings = full_result.get("warnings", [])

        campaign = Campaign(
            product_id=product.id,
            name=f"Campanha - {product.name}",
            platform="meta",
            status=campaign_status,
            meta_campaign_id=full_result.get("campaign_id"),
            meta_adset_id=full_result.get("adset_id"),
            meta_creative_id=full_result.get("creative_id"),
            meta_ad_id=full_result.get("ad_id"),
            targeting=targeting,
            daily_budget=50,
            user_id=sale.user_id,
        )
        # Store errors and warnings in meta_errors for debugging
        all_messages = full_result.get("errors", []) + warnings
        if all_messages:
            campaign.meta_errors = json.dumps(all_messages)
        db.add(campaign)
        db.commit()
        db.refresh(campaign)

        sale.campaign_id = campaign.id
        sale.campaign_name = campaign.name
        sale.status = campaign_status
        if campaign_status == "error":
            sale.error_message = "; ".join(full_result["errors"])
        elif warnings:
            # Store warnings so frontend can display them (campaign still active)
            sale.error_message = "Avisos: " + "; ".join(warnings)
        db.commit()
        db.refresh(sale)
    except Exception as e:
        logger.error("Failed to create Meta campaign for sale %s: %s", sale.id, e)
        sale.status = "campaign_error"
        sale.error_message = str(e)
        db.commit()
        db.refresh(sale)


async def _create_tiktok_campaign(
    sale: Sale, product: Product, req: SaleCreate, db: Session
) -> None:
    """Create a mock TikTok campaign after sale creation."""
    try:
        campaign = Campaign(
            product_id=product.id,
            name=f"TikTok - {product.name}",
            platform="tiktok",
            status="mock",
            targeting={"age_min": 18, "age_max": 45, "interests": ["social media"]},
            daily_budget=50,
            user_id=sale.user_id,
        )
        db.add(campaign)
        db.commit()
        db.refresh(campaign)

        sale.campaign_id = campaign.id
        sale.campaign_name = campaign.name
        sale.status = "mock"
        db.commit()
        db.refresh(sale)
    except Exception as e:
        logger.error("Failed to create TikTok campaign for sale %s: %s", sale.id, e)
        sale.status = "campaign_error"
        sale.error_message = str(e)
        db.commit()
        db.refresh(sale)
