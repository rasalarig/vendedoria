from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.models.seller import Seller

router = APIRouter(prefix="/sellers", tags=["sellers"])

_backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_data_dir = "/app/data" if os.path.exists("/app/data") else _backend_dir
UPLOAD_DIR = os.path.join(_data_dir, "uploads", "faces")


# --------------- Pydantic Schemas ---------------

class SellerCreate(BaseModel):
    name: str
    avatar_face: str
    avatar_face_url: Optional[str] = None
    voice_id: str
    personality: str = "informal"
    language_style: Optional[str] = None
    catchphrases: Optional[str] = None  # JSON array as string


class SellerUpdate(BaseModel):
    name: Optional[str] = None
    avatar_face: Optional[str] = None
    avatar_face_url: Optional[str] = None
    voice_id: Optional[str] = None
    personality: Optional[str] = None
    language_style: Optional[str] = None
    catchphrases: Optional[str] = None


class SellerResponse(BaseModel):
    id: int
    user_id: int
    name: str
    avatar_face: str
    avatar_face_url: Optional[str] = None
    voice_id: str
    personality: str
    language_style: Optional[str] = None
    catchphrases: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class FaceOption(BaseModel):
    id: str
    name: str
    gender: str
    age_range: str
    style: str
    thumbnail_url: str
    is_custom: bool = False


class VoiceOption(BaseModel):
    id: str
    name: str
    gender: str
    tone: str
    language: str
    preview_url: str


# --------------- Static catalogs ---------------

FACES_CATALOG: List[dict] = [
    {
        "id": "vendedor_1",
        "name": "Carlos",
        "gender": "male",
        "age_range": "30-40",
        "style": "profissional",
        "thumbnail_url": "/assets/faces/vendedor.avif",
        "is_custom": False,
    },
    {
        "id": "vendedora_1",
        "name": "Ana",
        "gender": "female",
        "age_range": "25-35",
        "style": "profissional",
        "thumbnail_url": "/assets/faces/vendedora.avif",
        "is_custom": False,
    },
    {
        "id": "custom",
        "name": "Personalizado",
        "gender": "other",
        "age_range": "",
        "style": "custom",
        "thumbnail_url": "",
        "is_custom": True,
    },
]

VOICES_CATALOG: List[dict] = [
    {"id": "voice_1", "name": "Marcos", "gender": "masculino", "tone": "animado", "language": "pt-BR", "preview_url": "https://example.com/voices/voice_1_preview.mp3"},
    {"id": "voice_2", "name": "Patricia", "gender": "feminino", "tone": "amigavel", "language": "pt-BR", "preview_url": "https://example.com/voices/voice_2_preview.mp3"},
    {"id": "voice_3", "name": "Roberto", "gender": "masculino", "tone": "serio", "language": "pt-BR", "preview_url": "https://example.com/voices/voice_3_preview.mp3"},
    {"id": "voice_4", "name": "Fernanda", "gender": "feminino", "tone": "persuasivo", "language": "pt-BR", "preview_url": "https://example.com/voices/voice_4_preview.mp3"},
    {"id": "voice_5", "name": "Thiago", "gender": "masculino", "tone": "amigavel", "language": "pt-BR", "preview_url": "https://example.com/voices/voice_5_preview.mp3"},
    {"id": "voice_6", "name": "Larissa", "gender": "feminino", "tone": "animado", "language": "pt-BR", "preview_url": "https://example.com/voices/voice_6_preview.mp3"},
    {"id": "voice_7", "name": "Andre", "gender": "masculino", "tone": "persuasivo", "language": "pt-BR", "preview_url": "https://example.com/voices/voice_7_preview.mp3"},
    {"id": "voice_8", "name": "Carolina", "gender": "feminino", "tone": "serio", "language": "pt-BR", "preview_url": "https://example.com/voices/voice_8_preview.mp3"},
]


# --------------- Helper ---------------

def seller_to_response(seller: Seller) -> dict:
    return {
        "id": seller.id,
        "user_id": seller.user_id,
        "name": seller.name,
        "avatar_face": seller.avatar_face,
        "avatar_face_url": seller.avatar_face_url,
        "voice_id": seller.voice_id,
        "personality": seller.personality,
        "language_style": seller.language_style,
        "catchphrases": seller.catchphrases,
        "created_at": str(seller.created_at) if seller.created_at else None,
        "updated_at": str(seller.updated_at) if seller.updated_at else None,
    }


# --------------- Catalog endpoints (no auth) ---------------

@router.get("/faces", response_model=List[FaceOption])
async def list_faces():
    """Return catalog of available avatar faces."""
    return FACES_CATALOG


@router.get("/voices", response_model=List[VoiceOption])
async def list_voices():
    """Return catalog of available voices."""
    return VOICES_CATALOG


# --------------- Face upload endpoint ---------------

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".avif"}


@router.post("/faces/upload")
async def upload_custom_face(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    """Upload a custom face photo for seller avatar."""
    # Validate content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de arquivo nao permitido. Use: JPG, PNG, WebP ou AVIF",
        )

    # Validate extension
    _, ext = os.path.splitext(file.filename or "upload.jpg")
    ext = ext.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Extensao de arquivo nao permitida. Use: .jpg, .png, .webp ou .avif",
        )

    # Create upload directory if needed
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    unique_id = uuid.uuid4().hex[:12]
    filename = f"{user_id}_{unique_id}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    # Save the file
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    face_id = f"custom_{unique_id}"
    thumbnail_url = f"/uploads/faces/{filename}"

    return {
        "face_id": face_id,
        "thumbnail_url": thumbnail_url,
    }


# --------------- CRUD endpoints (auth required) ---------------

@router.post("", response_model=SellerResponse)
async def create_seller(
    data: SellerCreate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    seller = Seller(
        user_id=user_id,
        name=data.name,
        avatar_face=data.avatar_face,
        avatar_face_url=data.avatar_face_url,
        voice_id=data.voice_id,
        personality=data.personality,
        language_style=data.language_style,
        catchphrases=data.catchphrases,
    )
    db.add(seller)
    db.commit()
    db.refresh(seller)
    return seller_to_response(seller)


@router.get("", response_model=List[SellerResponse])
async def list_sellers(
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    sellers = (
        db.query(Seller)
        .filter(Seller.user_id == user_id)
        .order_by(Seller.created_at.desc())
        .all()
    )
    return [seller_to_response(s) for s in sellers]


@router.get("/{seller_id}", response_model=SellerResponse)
async def get_seller(
    seller_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    seller = db.query(Seller).filter(Seller.id == seller_id, Seller.user_id == user_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Vendedor virtual nao encontrado")
    return seller_to_response(seller)


@router.put("/{seller_id}", response_model=SellerResponse)
async def update_seller(
    seller_id: int,
    data: SellerUpdate,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    seller = db.query(Seller).filter(Seller.id == seller_id, Seller.user_id == user_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Vendedor virtual nao encontrado")

    if data.name is not None:
        seller.name = data.name
    if data.avatar_face is not None:
        seller.avatar_face = data.avatar_face
    if data.avatar_face_url is not None:
        seller.avatar_face_url = data.avatar_face_url
    if data.voice_id is not None:
        seller.voice_id = data.voice_id
    if data.personality is not None:
        seller.personality = data.personality
    if data.language_style is not None:
        seller.language_style = data.language_style
    if data.catchphrases is not None:
        seller.catchphrases = data.catchphrases

    db.commit()
    db.refresh(seller)
    return seller_to_response(seller)


@router.delete("/{seller_id}")
async def delete_seller(
    seller_id: int,
    db: Session = Depends(get_db),
    user_id: int = Depends(get_current_user_id),
):
    seller = db.query(Seller).filter(Seller.id == seller_id, Seller.user_id == user_id).first()
    if not seller:
        raise HTTPException(status_code=404, detail="Vendedor virtual nao encontrado")

    db.delete(seller)
    db.commit()
    return {"detail": "Vendedor virtual removido com sucesso"}
