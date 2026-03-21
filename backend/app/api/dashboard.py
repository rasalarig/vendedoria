from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.campaign import Campaign
from app.models.creative import Creative
from app.models.product import Product

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Dashboard V2 - aggregate real campaign metrics."""
    campaigns = db.query(Campaign).filter(Campaign.user_id == user_id).all()

    total_spent = sum(c.spent or 0 for c in campaigns)
    total_impressions = sum(c.impressions or 0 for c in campaigns)
    total_clicks = sum(c.clicks or 0 for c in campaigns)
    total_leads = sum(c.leads or 0 for c in campaigns)
    total_conversions = sum(c.conversions or 0 for c in campaigns)

    active_campaigns = [c for c in campaigns if c.status in ("active", "ACTIVE", "published")]
    active_count = len(active_campaigns)

    # CTR calculation
    ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0.0
    # ROI placeholder (revenue not tracked yet, use conversions * avg as proxy)
    estimated_revenue = total_conversions * 100  # placeholder R$100 per conversion
    roi = ((estimated_revenue - total_spent) / total_spent * 100) if total_spent > 0 else 0.0

    # Build campaign list for table
    campaign_list = []
    for c in campaigns:
        product = db.query(Product).filter(Product.id == c.product_id).first() if c.product_id else None
        c_ctr = (c.clicks / c.impressions * 100) if c.impressions and c.impressions > 0 else 0.0
        campaign_list.append({
            "id": c.id,
            "name": c.name,
            "platform": c.platform or "meta",
            "status": c.status or "draft",
            "daily_budget": c.daily_budget or 0,
            "impressions": c.impressions or 0,
            "clicks": c.clicks or 0,
            "ctr": round(c_ctr, 2),
            "spent": c.spent or 0,
            "product_name": product.name if product else "",
        })

    # Top creatives by CTR
    creatives = db.query(Creative).filter(Creative.user_id == user_id).all()
    creative_list = []
    for cr in creatives:
        # Look up campaign stats linked to this creative
        linked = [c for c in campaigns if c.creative_id == cr.id]
        cr_impressions = sum(c.impressions or 0 for c in linked)
        cr_clicks = sum(c.clicks or 0 for c in linked)
        cr_ctr = (cr_clicks / cr_impressions * 100) if cr_impressions > 0 else 0.0
        product = db.query(Product).filter(Product.id == cr.product_id).first() if cr.product_id else None
        creative_list.append({
            "id": cr.id,
            "headline": cr.headline or "",
            "image_url": cr.image_url or "",
            "product_name": product.name if product else "",
            "ctr": round(cr_ctr, 2),
            "clicks": cr_clicks,
        })
    top_creatives = sorted(creative_list, key=lambda x: x["ctr"], reverse=True)[:3]

    # Top products by clicks
    products = db.query(Product).filter(Product.user_id == user_id).all()
    product_stats = []
    for p in products:
        p_campaigns = [c for c in campaigns if c.product_id == p.id]
        p_clicks = sum(c.clicks or 0 for c in p_campaigns)
        product_stats.append({
            "id": p.id,
            "name": p.name,
            "image_url": getattr(p, "image_url", "") or "",
            "clicks": p_clicks,
        })
    top_products = sorted(product_stats, key=lambda x: x["clicks"], reverse=True)[:3]

    # Chart data: daily breakdown (placeholder — 7 day mock based on totals)
    chart_data = {
        "labels": ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
        "impressions": [0, 0, 0, 0, 0, 0, total_impressions],
        "clicks": [0, 0, 0, 0, 0, 0, total_clicks],
        "spent": [0, 0, 0, 0, 0, 0, round(total_spent, 2)],
        "ctr": [0, 0, 0, 0, 0, 0, round(ctr, 2)],
    }

    return {
        "metrics": {
            "total_spent": round(total_spent, 2),
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "roi": round(roi, 1),
            "ctr": round(ctr, 2),
            "active_campaigns": active_count,
            "total_leads": total_leads,
            "total_conversions": total_conversions,
        },
        "campaigns": campaign_list,
        "chart_data": chart_data,
        "top_creatives": top_creatives,
        "top_products": top_products,
        "recent_activities": [
            {"type": "campaign", "message": f"{active_count} campanhas ativas", "time": "agora"},
            {"type": "lead", "message": f"{total_leads} leads captados", "time": "total"},
            {"type": "conversion", "message": f"{total_conversions} conversoes", "time": "total"},
        ],
    }
