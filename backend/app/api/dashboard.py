from fastapi import APIRouter, Depends

from app.core.auth import get_current_user_id

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(user_id: int = Depends(get_current_user_id)):
    return {
        "metrics": {
            "active_campaigns": 3,
            "leads_today": 47,
            "conversion_rate": 12.5,
            "budget_spent": 1250.00,
            "budget_total": 5000.00
        },
        "chart_data": {
            "labels": ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
            "leads": [12, 19, 8, 25, 32, 47, 35],
            "conversions": [2, 3, 1, 4, 5, 8, 6]
        },
        "recent_activities": [
            {"type": "lead", "message": "Novo lead: Joao Silva", "time": "5 min atras"},
            {"type": "campaign", "message": "Campanha 'Curso Excel' ativada", "time": "1h atras"},
            {"type": "whatsapp", "message": "150 mensagens enviadas", "time": "2h atras"},
            {"type": "conversion", "message": "Venda confirmada: R$297", "time": "3h atras"}
        ]
    }
