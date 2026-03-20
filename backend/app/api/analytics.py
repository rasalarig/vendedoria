from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.campaign import Campaign
from app.models.whatsapp import WhatsAppCampaign
from app.models.lead import Lead

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
async def get_analytics(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Consolidate all metrics from Meta Ads campaigns and WhatsApp campaigns."""

    # Meta Ads campaigns aggregation
    meta_campaigns = db.query(Campaign).filter(Campaign.user_id == user_id).all()
    total_impressions = sum(c.impressions or 0 for c in meta_campaigns)
    total_clicks = sum(c.clicks or 0 for c in meta_campaigns)
    total_meta_leads = sum(c.leads or 0 for c in meta_campaigns)
    total_conversions = sum(c.conversions or 0 for c in meta_campaigns)
    total_spent = sum(c.spent or 0 for c in meta_campaigns)

    # WhatsApp campaigns aggregation
    wa_campaigns = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.user_id == user_id).all()
    total_wa_sent = sum(c.sent_count or 0 for c in wa_campaigns)
    total_wa_delivered = sum(c.delivered_count or 0 for c in wa_campaigns)
    total_wa_read = sum(c.read_count or 0 for c in wa_campaigns)
    total_wa_replied = sum(c.replied_count or 0 for c in wa_campaigns)

    # Lead stats
    lead_stats = {}
    for status in ["novo", "contatado", "interessado", "convertido", "perdido"]:
        count = db.query(Lead).filter(Lead.funnel_status == status, Lead.user_id == user_id).count()
        lead_stats[status] = count
    total_leads = db.query(Lead).filter(Lead.user_id == user_id).count()

    # KPIs
    total_all_leads = total_meta_leads + total_leads
    cpl = round(total_spent / max(total_all_leads, 1), 2)
    cpa = round(total_spent / max(total_conversions, 1), 2)
    avg_ctr = round(total_clicks / max(total_impressions, 1) * 100, 2)
    roas = round((total_conversions * 297) / max(total_spent, 1), 2)
    wa_response_rate = round(total_wa_replied / max(total_wa_sent, 1) * 100, 2)

    # Campaign comparison data
    campaign_comparison = []
    for c in meta_campaigns:
        campaign_comparison.append({
            "name": c.name,
            "platform": "Meta Ads",
            "impressions": c.impressions or 0,
            "clicks": c.clicks or 0,
            "leads": c.leads or 0,
            "conversions": c.conversions or 0,
            "spent": c.spent or 0,
            "ctr": c.ctr or 0,
            "cpc": c.cpc or 0
        })
    for c in wa_campaigns:
        campaign_comparison.append({
            "name": c.name,
            "platform": "WhatsApp",
            "sent": c.sent_count or 0,
            "delivered": c.delivered_count or 0,
            "read": c.read_count or 0,
            "replied": c.replied_count or 0,
            "response_rate": round(
                (c.replied_count or 0) / max(c.sent_count or 0, 1) * 100, 2
            )
        })

    # Funnel data
    funnel = [
        {"stage": "Impressoes", "value": total_impressions, "color": "#2196F3"},
        {"stage": "Cliques", "value": total_clicks, "color": "#00BCD4"},
        {"stage": "Leads", "value": total_all_leads, "color": "#9C27B0"},
        {"stage": "Conversoes", "value": total_conversions, "color": "#4CAF50"}
    ]

    return {
        "kpis": {
            "total_spent": round(total_spent, 2),
            "total_leads": total_all_leads,
            "total_conversions": total_conversions,
            "cpl": cpl,
            "cpa": cpa,
            "avg_ctr": avg_ctr,
            "roas": roas,
            "wa_response_rate": wa_response_rate
        },
        "funnel": funnel,
        "lead_stats": lead_stats,
        "campaign_comparison": campaign_comparison,
        "meta_summary": {
            "total_campaigns": len(meta_campaigns),
            "active": len([c for c in meta_campaigns if c.status == "active"]),
            "total_impressions": total_impressions,
            "total_clicks": total_clicks,
            "total_spent": round(total_spent, 2)
        },
        "whatsapp_summary": {
            "total_campaigns": len(wa_campaigns),
            "total_sent": total_wa_sent,
            "total_delivered": total_wa_delivered,
            "total_read": total_wa_read,
            "total_replied": total_wa_replied
        },
        "chart_data": {
            "labels": ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
            "leads": [5, 12, 8, 15, 22, 18, 10],
            "conversions": [1, 3, 2, 4, 6, 5, 3],
            "spent": [45, 52, 48, 55, 60, 50, 35]
        }
    }
