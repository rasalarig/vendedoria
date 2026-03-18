from fastapi import APIRouter

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard():
    return {
        "metrics": {
            "active_campaigns": 3,
            "leads_today": 47,
            "conversion_rate": 12.5,
            "budget_spent": 1250.00,
            "budget_total": 5000.00
        },
        "chart_data": {
            "labels": ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
            "leads": [12, 19, 8, 25, 32, 47, 35],
            "conversions": [2, 3, 1, 4, 5, 8, 6]
        },
        "recent_activities": [
            {"type": "lead", "message": "Novo lead: João Silva", "time": "5 min atrás"},
            {"type": "campaign", "message": "Campanha 'Curso Excel' ativada", "time": "1h atrás"},
            {"type": "whatsapp", "message": "150 mensagens enviadas", "time": "2h atrás"},
            {"type": "conversion", "message": "Venda confirmada: R$297", "time": "3h atrás"}
        ]
    }
