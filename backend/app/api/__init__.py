from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.dashboard import router as dashboard_router
from app.api.products import router as products_router
from app.api.settings import router as settings_router
from app.api.creatives import router as creatives_router
from app.api.campaigns import router as campaigns_router
from app.api.whatsapp import router as whatsapp_router
from app.api.leads import router as leads_router
from app.api.strategy import router as strategy_router
from app.api.analytics import router as analytics_router
from app.api.chat import router as chat_router
from app.api.meta_oauth import router as meta_oauth_router
from app.api.pixel import router as pixel_router
from app.api.tiktok import router as tiktok_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(dashboard_router)
api_router.include_router(products_router)
api_router.include_router(settings_router)
api_router.include_router(creatives_router)
api_router.include_router(campaigns_router)
api_router.include_router(whatsapp_router)
api_router.include_router(leads_router)
api_router.include_router(strategy_router)
api_router.include_router(analytics_router)
api_router.include_router(chat_router)
api_router.include_router(meta_oauth_router)
api_router.include_router(pixel_router)
api_router.include_router(tiktok_router)
