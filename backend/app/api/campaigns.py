import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.models.campaign import Campaign
from app.models.product import Product
from app.models.creative import Creative
from app.models.settings import Settings
from app.services.meta_ads import MetaAdsService
from app.services.meta_oauth import MetaOAuthService

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


class CampaignCreate(BaseModel):
    product_id: int
    creative_id: Optional[int] = None
    daily_budget: float = 0.0
    total_budget: float = 0.0


class CampaignResponse(BaseModel):
    id: int
    product_id: int
    creative_id: Optional[int] = None
    name: str
    platform: str = "meta"
    status: str = "draft"
    objective: str = "CONVERSIONS"
    meta_campaign_id: Optional[str] = None
    meta_adset_id: Optional[str] = None
    meta_ad_id: Optional[str] = None
    meta_creative_id: Optional[str] = None
    meta_errors: Optional[list] = None
    targeting: Optional[dict] = None
    daily_budget: float = 0.0
    total_budget: float = 0.0
    spent: float = 0.0
    impressions: int = 0
    clicks: int = 0
    leads: int = 0
    conversions: int = 0
    ctr: float = 0.0
    cpc: float = 0.0
    cpl: float = 0.0
    ai_strategy: Optional[str] = None
    product_name: Optional[str] = None
    creative_headline: Optional[str] = None
    creative_copy: Optional[str] = None
    creative_image_url: Optional[str] = None
    creative_cta: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


def campaign_to_response(c: Campaign, product_name: str = "", creative_headline: str = "", creative_copy: str = "", creative_image_url: str = "", creative_cta: str = "") -> dict:
    return {
        "id": c.id,
        "product_id": c.product_id,
        "creative_id": c.creative_id,
        "name": c.name,
        "platform": c.platform or "meta",
        "status": c.status or "draft",
        "objective": c.objective or "CONVERSIONS",
        "meta_campaign_id": c.meta_campaign_id,
        "meta_adset_id": c.meta_adset_id,
        "meta_ad_id": c.meta_ad_id,
        "meta_creative_id": c.meta_creative_id if hasattr(c, 'meta_creative_id') else None,
        "meta_errors": json.loads(c.meta_errors) if hasattr(c, 'meta_errors') and c.meta_errors else None,
        "targeting": c.targeting,
        "daily_budget": c.daily_budget or 0.0,
        "total_budget": c.total_budget or 0.0,
        "spent": c.spent or 0.0,
        "impressions": c.impressions or 0,
        "clicks": c.clicks or 0,
        "leads": c.leads or 0,
        "conversions": c.conversions or 0,
        "ctr": c.ctr or 0.0,
        "cpc": c.cpc or 0.0,
        "cpl": c.cpl or 0.0,
        "ai_strategy": c.ai_strategy,
        "product_name": product_name,
        "creative_headline": creative_headline,
        "creative_copy": creative_copy,
        "creative_image_url": creative_image_url,
        "creative_cta": creative_cta,
        "created_at": str(c.created_at) if c.created_at else None,
        "updated_at": str(c.updated_at) if c.updated_at else None,
    }


@router.post("", response_model=CampaignResponse)
async def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    # Get product
    product = db.query(Product).filter(Product.id == data.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Produto nao encontrado")

    # Get creative (optional)
    creative = None
    if data.creative_id:
        creative = db.query(Creative).filter(Creative.id == data.creative_id).first()
        if not creative:
            raise HTTPException(status_code=404, detail="Criativo nao encontrado")

    # Get settings
    settings = db.query(Settings).filter(Settings.id == 1).first()
    access_token = ""
    ad_account_id = ""
    daily_budget_limit = 0.0
    monthly_budget_limit = 0.0
    if settings:
        access_token = settings.meta_access_token or ""
        ad_account_id = settings.meta_ad_account_id or ""
        daily_budget_limit = settings.daily_budget_limit or 0.0
        monthly_budget_limit = settings.monthly_budget_limit or 0.0

    # Validate Facebook Page
    page_id = settings.facebook_page_id if settings else ""
    if not page_id:
        raise HTTPException(
            status_code=400,
            detail="Facebook Page nao configurada. Crie uma pagina em facebook.com/pages/create e reconecte sua conta Meta nas Configuracoes."
        )

    # Enforce budget limits
    daily_budget = data.daily_budget
    if daily_budget_limit > 0 and daily_budget > daily_budget_limit:
        daily_budget = daily_budget_limit

    total_budget = data.total_budget
    if monthly_budget_limit > 0 and total_budget > monthly_budget_limit:
        total_budget = monthly_budget_limit

    # Use MetaAdsService
    meta_service = MetaAdsService(access_token=access_token, ad_account_id=ad_account_id)

    # Suggest targeting
    targeting_data = meta_service.suggest_targeting(
        product_name=product.name,
        target_audience=product.target_audience or "",
        price=product.price,
    )

    # If daily_budget not set, use suggested
    if daily_budget <= 0:
        daily_budget = targeting_data.get("suggested_daily_budget", 20.0)
        if daily_budget_limit > 0 and daily_budget > daily_budget_limit:
            daily_budget = daily_budget_limit

    campaign_name = f"Campanha - {product.name}"
    if creative:
        campaign_name = f"Campanha - {product.name} - {creative.headline or 'Criativo'}"

    # Create campaign on Meta (real or mock)
    meta_campaign = await meta_service.create_campaign(name=campaign_name)
    meta_campaign_id = meta_campaign.get("id", "")

    # Create adset
    meta_adset = await meta_service.create_adset(
        campaign_id=meta_campaign_id,
        name=f"Adset - {product.name}",
        targeting=targeting_data,
        daily_budget=daily_budget,
    )
    meta_adset_id = meta_adset.get("id", "")

    # Create ad
    creative_data = {}
    if creative:
        creative_data = {
            "headline": creative.headline,
            "copy_text": creative.copy_text,
            "cta": creative.cta,
            "image_url": creative.image_url,
        }
    meta_ad = await meta_service.create_ad(
        adset_id=meta_adset_id,
        name=f"Ad - {product.name}",
        creative_data=creative_data,
    )
    meta_ad_id = meta_ad.get("id", "")

    # Save campaign to DB
    campaign = Campaign(
        product_id=product.id,
        creative_id=creative.id if creative else None,
        name=campaign_name,
        platform="meta",
        status="active",
        objective="CONVERSIONS",
        meta_campaign_id=meta_campaign_id,
        meta_adset_id=meta_adset_id,
        meta_ad_id=meta_ad_id,
        targeting=targeting_data,
        daily_budget=daily_budget,
        total_budget=total_budget,
        ai_strategy=targeting_data.get("strategy", ""),
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return campaign_to_response(
        campaign,
        product_name=product.name,
        creative_headline=creative.headline if creative else "",
        creative_copy=creative.copy_text if creative else "",
        creative_image_url=creative.image_url if creative else "",
        creative_cta=creative.cta if creative else "",
    )


@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    result = []
    for c in campaigns:
        product = db.query(Product).filter(Product.id == c.product_id).first()
        product_name = product.name if product else "Produto removido"
        creative_headline = ""
        creative_copy = ""
        creative_image_url = ""
        creative_cta = ""
        if c.creative_id:
            creative = db.query(Creative).filter(Creative.id == c.creative_id).first()
            if creative:
                creative_headline = creative.headline or ""
                creative_copy = creative.copy_text or ""
                creative_image_url = creative.image_url or ""
                creative_cta = creative.cta or ""
        result.append(campaign_to_response(c, product_name=product_name, creative_headline=creative_headline, creative_copy=creative_copy, creative_image_url=creative_image_url, creative_cta=creative_cta))
    return result


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")

    # Get fresh metrics
    settings = db.query(Settings).filter(Settings.id == 1).first()
    access_token = ""
    ad_account_id = ""
    if settings:
        access_token = settings.meta_access_token or ""
        ad_account_id = settings.meta_ad_account_id or ""

    meta_service = MetaAdsService(access_token=access_token, ad_account_id=ad_account_id)

    if campaign.status == "active" and campaign.meta_campaign_id:
        metrics = await meta_service.get_metrics(campaign.meta_campaign_id)
        if metrics:
            campaign.impressions = metrics.get("impressions", campaign.impressions)
            campaign.clicks = metrics.get("clicks", campaign.clicks)
            campaign.leads = metrics.get("leads", campaign.leads)
            campaign.conversions = metrics.get("conversions", campaign.conversions)
            campaign.ctr = metrics.get("ctr", campaign.ctr)
            campaign.cpc = metrics.get("cpc", campaign.cpc)
            campaign.cpl = metrics.get("cpl", campaign.cpl)
            campaign.spent = metrics.get("spent", campaign.spent)
            db.commit()
            db.refresh(campaign)

    product = db.query(Product).filter(Product.id == campaign.product_id).first()
    product_name = product.name if product else "Produto removido"
    creative_headline = ""
    creative_copy = ""
    creative_image_url = ""
    creative_cta = ""
    if campaign.creative_id:
        creative = db.query(Creative).filter(Creative.id == campaign.creative_id).first()
        if creative:
            creative_headline = creative.headline or ""
            creative_copy = creative.copy_text or ""
            creative_image_url = creative.image_url or ""
            creative_cta = creative.cta or ""

    return campaign_to_response(campaign, product_name=product_name, creative_headline=creative_headline, creative_copy=creative_copy, creative_image_url=creative_image_url, creative_cta=creative_cta)


@router.put("/{campaign_id}/pause", response_model=CampaignResponse)
async def pause_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    campaign.status = "paused"
    db.commit()
    db.refresh(campaign)

    product = db.query(Product).filter(Product.id == campaign.product_id).first()
    product_name = product.name if product else ""
    return campaign_to_response(campaign, product_name=product_name)


@router.put("/{campaign_id}/resume", response_model=CampaignResponse)
async def resume_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    campaign.status = "active"
    db.commit()
    db.refresh(campaign)

    product = db.query(Product).filter(Product.id == campaign.product_id).first()
    product_name = product.name if product else ""
    return campaign_to_response(campaign, product_name=product_name)


@router.post("/{campaign_id}/activate")
async def activate_campaign_on_meta(campaign_id: int, db: Session = Depends(get_db)):
    """Smart auto-resolve + activate: fixes all prerequisites then activates the campaign."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")

    if not campaign.meta_campaign_id:
        raise HTTPException(status_code=400, detail="Esta campanha nao tem ID do Meta Ads. Foi criada em modo simulado.")

    # Get settings
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token:
        raise HTTPException(status_code=400, detail="Meta Ads nao configurado. Va em Configuracoes para conectar sua conta.")

    # Auto-resolve ad account if missing
    if not settings.meta_ad_account_id:
        try:
            oauth_service = MetaOAuthService(settings.meta_app_id or "", settings.meta_app_secret or "")
            accounts = await oauth_service.get_ad_accounts(settings.meta_access_token)
            if accounts:
                settings.meta_ad_account_id = accounts[0]["id"]
                db.commit()
                db.refresh(settings)
            else:
                raise HTTPException(status_code=400, detail="Nenhuma conta de anuncios encontrada. Va em Configuracoes para selecionar uma conta.")
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=400, detail="Erro ao buscar conta de anuncios. Va em Configuracoes para selecionar manualmente.")

    steps = []

    # Step 0: Auto-fetch Facebook Page if missing
    page_id = settings.facebook_page_id or ""
    if not page_id:
        try:
            oauth_service = MetaOAuthService(settings.meta_app_id or "", settings.meta_app_secret or "")
            pages = await oauth_service.get_pages(settings.meta_access_token)
            if pages and len(pages) > 0:
                page_id = pages[0].get("id", "")
                if page_id:
                    settings.facebook_page_id = page_id
                    db.commit()
                    db.refresh(settings)
                    steps.append("Pagina do Facebook sincronizada automaticamente")
            if not page_id:
                return {
                    "success": False,
                    "error": "no_page",
                    "message": "Voce precisa criar uma Pagina do Facebook antes de ativar campanhas. Acesse facebook.com/pages/create, crie sua pagina, e depois clique em Ativar novamente.",
                }
        except Exception:
            return {
                "success": False,
                "error": "no_page",
                "message": "Voce precisa criar uma Pagina do Facebook antes de ativar campanhas. Acesse facebook.com/pages/create, crie sua pagina, e depois clique em Ativar novamente.",
            }

    # Step 1: Auto-repair missing components
    needs_repair = (
        not campaign.meta_adset_id
        or not campaign.meta_creative_id
        or not campaign.meta_ad_id
    )

    if needs_repair:
        meta_repair_service = MetaAdsService(
            access_token=settings.meta_access_token,
            ad_account_id=settings.meta_ad_account_id,
            page_id=page_id,
        )

        product = db.query(Product).filter(Product.id == campaign.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail="Produto vinculado nao encontrado.")

        creative = None
        if campaign.creative_id:
            creative = db.query(Creative).filter(Creative.id == campaign.creative_id).first()
        if not creative:
            creative = db.query(Creative).filter(Creative.product_id == product.id).order_by(Creative.id.desc()).first()

        repair_errors = []

        # Create Ad Set if missing
        if not campaign.meta_adset_id:
            targeting = campaign.targeting or meta_repair_service.suggest_targeting(product.name, product.target_audience or "", product.price)
            adset_result = await meta_repair_service.create_adset(
                campaign_id=campaign.meta_campaign_id,
                name=f"AdSet - {product.name}",
                targeting=targeting,
                daily_budget=campaign.daily_budget or 50,
            )
            if adset_result.get("id"):
                campaign.meta_adset_id = adset_result["id"]
                steps.append("Conjunto de anuncios criado")
            elif adset_result.get("error"):
                repair_errors.append(f"Ad Set: {adset_result['error']}")

        # Create Ad Creative if missing
        if not campaign.meta_creative_id:
            ad_message = f"Conheca {product.name}! {product.description or ''}"
            ad_headline = product.name
            ad_image_url = ""
            ad_cta = "LEARN_MORE"

            if creative:
                ad_message = creative.copy_text or ad_message
                ad_headline = creative.headline or ad_headline
                ad_image_url = creative.image_url or ""
                ad_cta = creative.cta or "LEARN_MORE"

            creative_result = await meta_repair_service.create_ad_creative(
                name=f"Creative - {product.name}",
                message=ad_message,
                headline=ad_headline,
                image_url=ad_image_url,
                cta_type=ad_cta,
            )
            if creative_result.get("id"):
                campaign.meta_creative_id = creative_result["id"]
                steps.append("Criativo criado")
            elif creative_result.get("error"):
                repair_errors.append(f"Criativo: {creative_result['error']}")

        # Create Ad if missing (requires both adset and creative)
        if not campaign.meta_ad_id and campaign.meta_adset_id and campaign.meta_creative_id:
            ad_result = await meta_repair_service.create_ad(
                adset_id=campaign.meta_adset_id,
                creative_id=campaign.meta_creative_id,
                name=f"Ad - {product.name}",
            )
            if ad_result.get("id"):
                campaign.meta_ad_id = ad_result["id"]
                steps.append("Anuncio criado")
            elif ad_result.get("error"):
                repair_errors.append(f"Anuncio: {ad_result['error']}")

        if repair_errors:
            campaign.meta_errors = json.dumps(repair_errors)
            db.commit()
            db.refresh(campaign)
            product_obj = db.query(Product).filter(Product.id == campaign.product_id).first()
            product_name = product_obj.name if product_obj else ""
            return {
                "success": False,
                "error": "repair_failed",
                "message": f"Erro ao preparar campanha: {', '.join(repair_errors)}",
                "steps": steps,
                "campaign": campaign_to_response(campaign, product_name=product_name),
            }

        # Clear any previous errors after successful repair
        campaign.meta_errors = None
        db.commit()

    # Step 2: Create meta service for activation (without page_id, not needed for activation)
    meta_service = MetaAdsService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id,
    )

    # Step 3: Check payment
    payment_info = await meta_service.check_payment()
    if not payment_info.get("has_payment"):
        return {
            "success": False,
            "error": "payment_missing",
            "message": "Sua conta de anuncios nao tem metodo de pagamento configurado. Adicione um cartao de credito em business.facebook.com/billing antes de ativar a campanha.",
            "steps": steps,
        }

    # Step 4: Activate campaign
    campaign_result = await meta_service.activate_campaign(campaign.meta_campaign_id)
    if not campaign_result.get("success"):
        return {
            "success": False,
            "error": "activation_failed",
            "message": campaign_result.get("error", "Erro ao ativar campanha no Meta"),
            "steps": steps,
        }

    # Step 5: Activate ad set (if exists)
    if campaign.meta_adset_id:
        adset_result = await meta_service.activate_adset(campaign.meta_adset_id)
        if not adset_result.get("success"):
            return {
                "success": False,
                "error": "adset_activation_failed",
                "message": f"Campanha ativada mas erro no conjunto de anuncios: {adset_result.get('error', '')}",
                "steps": steps,
            }

    steps.append("Campanha ativada!")

    # Step 6: Update local DB
    campaign.status = "active"
    db.commit()
    db.refresh(campaign)

    product = db.query(Product).filter(Product.id == campaign.product_id).first()
    product_name = product.name if product else ""

    return {
        "success": True,
        "steps": steps,
        "message": "Campanha ativada com sucesso no Meta Ads!",
        "campaign": campaign_to_response(campaign, product_name=product_name),
    }


@router.post("/{campaign_id}/repair")
async def repair_campaign(campaign_id: int, db: Session = Depends(get_db)):
    """Repair an incomplete campaign - create missing Meta components."""
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")

    if not campaign.meta_campaign_id or campaign.meta_campaign_id.startswith("mock_"):
        raise HTTPException(status_code=400, detail="Esta campanha nao tem ID real do Meta Ads.")

    # Get settings
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token or not settings.meta_ad_account_id:
        raise HTTPException(status_code=400, detail="Meta Ads nao configurado.")

    page_id = settings.facebook_page_id or ""
    if not page_id:
        raise HTTPException(status_code=400, detail="Facebook Page nao configurada. Crie uma pagina em facebook.com/pages/create e reconecte sua conta Meta.")

    meta_service = MetaAdsService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id,
        page_id=page_id,
    )

    # Get product and creative data
    product = db.query(Product).filter(Product.id == campaign.product_id).first()
    if not product:
        raise HTTPException(status_code=400, detail="Produto vinculado nao encontrado.")

    creative = None
    if campaign.creative_id:
        creative = db.query(Creative).filter(Creative.id == campaign.creative_id).first()
    if not creative:
        creative = db.query(Creative).filter(Creative.product_id == product.id).order_by(Creative.id.desc()).first()

    repaired = []
    errors = []

    # Step 1: Create Ad Set if missing
    if not campaign.meta_adset_id:
        targeting = campaign.targeting or meta_service.suggest_targeting(product.name, product.target_audience or "", product.price)
        adset_result = await meta_service.create_adset(
            campaign_id=campaign.meta_campaign_id,
            name=f"AdSet - {product.name}",
            targeting=targeting,
            daily_budget=campaign.daily_budget or 50,
        )
        if adset_result.get("id"):
            campaign.meta_adset_id = adset_result["id"]
            repaired.append("Conjunto de Anuncios criado")
        elif adset_result.get("error"):
            errors.append(f"Ad Set: {adset_result['error']}")

    # Step 2: Create Ad Creative if missing
    if not campaign.meta_creative_id:
        ad_message = f"Conheca {product.name}! {product.description or ''}"
        ad_headline = product.name
        ad_image_url = ""
        ad_cta = "LEARN_MORE"

        if creative:
            ad_message = creative.copy_text or ad_message
            ad_headline = creative.headline or ad_headline
            ad_image_url = creative.image_url or ""
            ad_cta = creative.cta or "LEARN_MORE"

        creative_result = await meta_service.create_ad_creative(
            name=f"Creative - {product.name}",
            message=ad_message,
            headline=ad_headline,
            image_url=ad_image_url,
            cta_type=ad_cta,
        )
        if creative_result.get("id"):
            campaign.meta_creative_id = creative_result["id"]
            repaired.append("Criativo criado")
        elif creative_result.get("error"):
            errors.append(f"Criativo: {creative_result['error']}")

    # Step 3: Create Ad if missing (requires both adset and creative)
    if not campaign.meta_ad_id and campaign.meta_adset_id and campaign.meta_creative_id:
        ad_result = await meta_service.create_ad(
            adset_id=campaign.meta_adset_id,
            creative_id=campaign.meta_creative_id,
            name=f"Ad - {product.name}",
        )
        if ad_result.get("id"):
            campaign.meta_ad_id = ad_result["id"]
            repaired.append("Anuncio criado")
        elif ad_result.get("error"):
            errors.append(f"Anuncio: {ad_result['error']}")

    # Update campaign status
    if errors:
        campaign.meta_errors = json.dumps(errors)
    else:
        campaign.meta_errors = None
        if campaign.status == "error":
            campaign.status = "active"

    db.commit()
    db.refresh(campaign)

    product_obj = db.query(Product).filter(Product.id == campaign.product_id).first()
    product_name = product_obj.name if product_obj else ""
    creative_headline = ""
    creative_copy = ""
    creative_image_url = ""
    creative_cta = ""
    if campaign.creative_id:
        cr = db.query(Creative).filter(Creative.id == campaign.creative_id).first()
        if cr:
            creative_headline = cr.headline or ""
            creative_copy = cr.copy_text or ""
            creative_image_url = cr.image_url or ""
            creative_cta = cr.cta or ""

    return {
        "success": len(errors) == 0,
        "repaired": repaired,
        "errors": errors,
        "message": f"Reparado: {', '.join(repaired)}" if repaired else "Nenhum componente reparado",
        "campaign": campaign_to_response(campaign, product_name=product_name, creative_headline=creative_headline, creative_copy=creative_copy, creative_image_url=creative_image_url, creative_cta=creative_cta),
    }


@router.delete("/{campaign_id}")
async def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    db.delete(campaign)
    db.commit()
    return {"detail": "Campanha removida com sucesso"}
