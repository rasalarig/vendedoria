from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func, or_
from pydantic import BaseModel
from typing import Optional
import csv
import io

from app.core.database import get_db
from app.models.lead import Lead, LeadInteraction

router = APIRouter(prefix="/leads", tags=["leads"])


# --- Pydantic schemas ---

class LeadCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = "manual"
    tags: Optional[str] = None
    funnel_status: Optional[str] = "novo"
    product_interest: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[str] = None
    funnel_status: Optional[str] = None
    product_interest: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None


class InteractionCreate(BaseModel):
    type: str = "note"
    description: str


class LeadResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: Optional[str] = None
    tags: Optional[str] = None
    funnel_status: Optional[str] = None
    product_interest: Optional[str] = None
    value: Optional[float] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class InteractionResponse(BaseModel):
    id: int
    lead_id: int
    type: str
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


# --- Helpers ---

def lead_to_response(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "source": lead.source,
        "tags": lead.tags,
        "funnel_status": lead.funnel_status,
        "product_interest": lead.product_interest,
        "value": lead.value,
        "notes": lead.notes,
        "created_at": str(lead.created_at) if lead.created_at else None,
        "updated_at": str(lead.updated_at) if lead.updated_at else None,
    }


def interaction_to_response(interaction: LeadInteraction) -> dict:
    return {
        "id": interaction.id,
        "lead_id": interaction.lead_id,
        "type": interaction.type,
        "description": interaction.description,
        "old_value": interaction.old_value,
        "new_value": interaction.new_value,
        "created_at": str(interaction.created_at) if interaction.created_at else None,
    }


# --- Stats endpoint (must be before /{lead_id} to avoid route conflict) ---

@router.get("/stats")
async def get_lead_stats(db: Session = Depends(get_db)):
    statuses = ["novo", "contatado", "interessado", "convertido", "perdido"]
    result = {}
    total = 0
    for status in statuses:
        count = db.query(sa_func.count(Lead.id)).filter(Lead.funnel_status == status).scalar() or 0
        result[status] = count
        total += count
    result["total"] = total
    return result


# --- Lead CRUD ---

@router.post("", response_model=LeadResponse)
async def create_lead(lead_data: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**lead_data.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Auto-create initial interaction
    interaction = LeadInteraction(
        lead_id=lead.id,
        type="note",
        description="Lead criado",
    )
    db.add(interaction)
    db.commit()

    return lead_to_response(lead)


@router.get("", response_model=list[LeadResponse])
async def list_leads(
    status: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(Lead)

    if status:
        query = query.filter(Lead.funnel_status == status)
    if tag:
        query = query.filter(Lead.tags.ilike(f"%{tag}%"))
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Lead.name.ilike(search_term),
                Lead.email.ilike(search_term),
                Lead.phone.ilike(search_term),
            )
        )

    leads = query.order_by(Lead.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    return [lead_to_response(l) for l in leads]


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")
    return lead_to_response(lead)


@router.put("/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: int, lead_data: LeadUpdate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")

    old_status = lead.funnel_status
    update_data = lead_data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(lead, key, value)

    db.commit()
    db.refresh(lead)

    # Auto-create status change interaction
    if "funnel_status" in update_data and update_data["funnel_status"] != old_status:
        interaction = LeadInteraction(
            lead_id=lead.id,
            type="status_change",
            description=f"Status alterado de '{old_status}' para '{lead.funnel_status}'",
            old_value=old_status,
            new_value=lead.funnel_status,
        )
        db.add(interaction)
        db.commit()

    return lead_to_response(lead)


@router.delete("/{lead_id}")
async def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")

    # Delete interactions first
    db.query(LeadInteraction).filter(LeadInteraction.lead_id == lead_id).delete()
    db.delete(lead)
    db.commit()
    return {"detail": "Lead removido com sucesso"}


# --- CSV Import ---

@router.post("/import")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Arquivo deve ser CSV")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    imported = 0
    errors = []
    for i, row in enumerate(reader, start=2):
        name = row.get("nome", "").strip()
        if not name:
            errors.append(f"Linha {i}: nome vazio")
            continue

        lead = Lead(
            name=name,
            email=row.get("email", "").strip() or None,
            phone=row.get("telefone", "").strip() or None,
            tags=row.get("tags", "").strip() or None,
            source="csv_import",
            funnel_status="novo",
        )
        db.add(lead)
        db.flush()

        interaction = LeadInteraction(
            lead_id=lead.id,
            type="note",
            description="Lead importado via CSV",
        )
        db.add(interaction)
        imported += 1

    db.commit()
    return {"imported": imported, "errors": errors}


# --- Interactions ---

@router.get("/{lead_id}/interactions", response_model=list[InteractionResponse])
async def get_interactions(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")

    interactions = (
        db.query(LeadInteraction)
        .filter(LeadInteraction.lead_id == lead_id)
        .order_by(LeadInteraction.created_at.desc())
        .all()
    )
    return [interaction_to_response(i) for i in interactions]


@router.post("/{lead_id}/interactions", response_model=InteractionResponse)
async def add_interaction(lead_id: int, data: InteractionCreate, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead nao encontrado")

    interaction = LeadInteraction(
        lead_id=lead_id,
        type=data.type,
        description=data.description,
    )
    db.add(interaction)
    db.commit()
    db.refresh(interaction)
    return interaction_to_response(interaction)
