from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.whatsapp import Contact, WhatsAppCampaign, WhatsAppMessage
from app.models.product import Product
from app.services.whatsapp import WhatsAppService

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


# --- Schemas ---

class ContactCreate(BaseModel):
    name: str
    phone: str
    tags: str = ""


class ContactResponse(BaseModel):
    id: int
    name: str
    phone: str
    tags: str | None
    status: str
    created_at: str | None

    class Config:
        from_attributes = True


class CampaignCreate(BaseModel):
    name: str
    product_id: int | None = None
    template_text: str
    contact_ids: list[int] | None = None
    tag_filter: str | None = None  # comma-separated tags


class CampaignResponse(BaseModel):
    id: int
    product_id: int | None
    name: str
    template_text: str
    status: str
    total_contacts: int
    sent_count: int
    delivered_count: int
    read_count: int
    replied_count: int
    error_count: int
    product_name: str | None = None
    created_at: str | None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    contact_name: str
    contact_phone: str
    message_text: str
    status: str
    sent_at: str | None

    class Config:
        from_attributes = True


# --- Contact Endpoints ---

@router.post("/contacts", response_model=ContactResponse)
async def create_contact(data: ContactCreate, db: Session = Depends(get_db)):
    # Check for duplicate phone
    existing = db.query(Contact).filter(Contact.phone == data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Contato com este telefone ja existe")

    contact = Contact(name=data.name, phone=data.phone, tags=data.tags or "")
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return _contact_to_response(contact)


@router.post("/contacts/import")
async def import_contacts(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    text = content.decode("utf-8-sig")  # handle BOM
    service = WhatsAppService()
    parsed = service.import_contacts_csv(text)

    imported = 0
    skipped = 0
    for item in parsed:
        existing = db.query(Contact).filter(Contact.phone == item["phone"]).first()
        if existing:
            skipped += 1
            continue
        contact = Contact(name=item["name"], phone=item["phone"], tags=item.get("tags", ""))
        db.add(contact)
        imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "total_in_file": len(parsed)}


@router.get("/contacts")
async def list_contacts(tag: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Contact).filter(Contact.status == "active")
    if tag:
        query = query.filter(Contact.tags.contains(tag))
    contacts = query.order_by(Contact.name).all()
    return [_contact_to_response(c) for c in contacts]


@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contato nao encontrado")
    db.delete(contact)
    db.commit()
    return {"detail": "Contato removido com sucesso"}


# --- Campaign Endpoints ---

@router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    # Get product info for personalization
    product_name = ""
    product_price = ""
    if data.product_id:
        product = db.query(Product).filter(Product.id == data.product_id).first()
        if product:
            product_name = product.name
            product_price = f"R$ {product.price:.2f}"

    # Determine contacts
    if data.contact_ids:
        contacts = db.query(Contact).filter(
            Contact.id.in_(data.contact_ids),
            Contact.status == "active",
        ).all()
    elif data.tag_filter:
        tags = [t.strip() for t in data.tag_filter.split(",") if t.strip()]
        query = db.query(Contact).filter(Contact.status == "active")
        if tags:
            from sqlalchemy import or_
            filters = [Contact.tags.contains(t) for t in tags]
            query = query.filter(or_(*filters))
        contacts = query.all()
    else:
        # All active contacts
        contacts = db.query(Contact).filter(Contact.status == "active").all()

    if not contacts:
        raise HTTPException(status_code=400, detail="Nenhum contato encontrado para esta campanha")

    # Create campaign
    campaign = WhatsAppCampaign(
        name=data.name,
        product_id=data.product_id,
        template_text=data.template_text,
        total_contacts=len(contacts),
        status="draft",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    # Create individual messages
    service = WhatsAppService()
    for contact in contacts:
        personalized = service.personalize_message(
            template=data.template_text,
            contact_name=contact.name,
            product_name=product_name,
            price=product_price,
        )
        msg = WhatsAppMessage(
            campaign_id=campaign.id,
            contact_id=contact.id,
            message_text=personalized,
            status="pending",
        )
        db.add(msg)

    db.commit()
    return _campaign_to_response(campaign, product_name)


@router.get("/campaigns")
async def list_campaigns(db: Session = Depends(get_db)):
    campaigns = db.query(WhatsAppCampaign).order_by(WhatsAppCampaign.created_at.desc()).all()
    result = []
    for c in campaigns:
        product_name = ""
        if c.product_id:
            product = db.query(Product).filter(Product.id == c.product_id).first()
            if product:
                product_name = product.name
        result.append(_campaign_to_response(c, product_name))
    return result


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")

    product_name = ""
    if campaign.product_id:
        product = db.query(Product).filter(Product.id == campaign.product_id).first()
        if product:
            product_name = product.name

    # Get messages with contact info
    messages = (
        db.query(WhatsAppMessage)
        .filter(WhatsAppMessage.campaign_id == campaign_id)
        .all()
    )
    message_list = []
    for msg in messages:
        contact = db.query(Contact).filter(Contact.id == msg.contact_id).first()
        message_list.append({
            "id": msg.id,
            "contact_name": contact.name if contact else "Desconhecido",
            "contact_phone": contact.phone if contact else "",
            "message_text": msg.message_text,
            "status": msg.status,
            "sent_at": str(msg.sent_at) if msg.sent_at else None,
        })

    resp = _campaign_to_response(campaign, product_name)
    resp["messages"] = message_list
    return resp


@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    if campaign.status not in ("draft", "paused"):
        raise HTTPException(status_code=400, detail="Campanha nao pode ser enviada neste status")

    service = WhatsAppService()
    result = await service.send_campaign(campaign_id, db)
    return result


@router.put("/campaigns/{campaign_id}/pause")
async def pause_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(WhatsAppCampaign).filter(WhatsAppCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campanha nao encontrada")
    campaign.status = "paused"
    db.commit()
    return {"detail": "Campanha pausada", "status": "paused"}


# --- Helpers ---

def _contact_to_response(c: Contact) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "phone": c.phone,
        "tags": c.tags or "",
        "status": c.status or "active",
        "created_at": str(c.created_at) if c.created_at else None,
    }


def _campaign_to_response(c: WhatsAppCampaign, product_name: str = "") -> dict:
    return {
        "id": c.id,
        "product_id": c.product_id,
        "name": c.name,
        "template_text": c.template_text,
        "status": c.status or "draft",
        "total_contacts": c.total_contacts or 0,
        "sent_count": c.sent_count or 0,
        "delivered_count": c.delivered_count or 0,
        "read_count": c.read_count or 0,
        "replied_count": c.replied_count or 0,
        "error_count": c.error_count or 0,
        "product_name": product_name,
        "created_at": str(c.created_at) if c.created_at else None,
    }
