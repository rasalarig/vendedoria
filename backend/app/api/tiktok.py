from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db

router = APIRouter(prefix="/tiktok", tags=["tiktok"])


@router.get("/status")
async def get_tiktok_status():
    """Check TikTok Ads integration status."""
    return {
        "configured": False,
        "mode": "demo",
        "message": "Integracao TikTok Ads em modo demonstracao. Configure as credenciais nas Configuracoes para publicar campanhas reais.",
    }
