from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.config import settings as app_settings
from app.models.settings import Settings
from app.services.meta_oauth import MetaOAuthService

router = APIRouter(prefix="/meta", tags=["meta-oauth"])


def _get_redirect_uri(request: Request) -> str:
    """Build redirect URI dynamically from the incoming request origin."""
    origin = request.headers.get("origin") or request.headers.get("referer") or ""
    if origin:
        # Strip path from referer if present
        from urllib.parse import urlparse
        parsed = urlparse(origin)
        base = f"{parsed.scheme}://{parsed.netloc}"
        return f"{base}/settings"
    # Fallback for production (Render)
    import os
    render_host = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
    if render_host:
        return f"https://{render_host}/settings"
    return "http://localhost:4200/settings"


class SelectAccountRequest(BaseModel):
    account_id: str
    account_name: str = ""


def _resolve_app_credentials(settings) -> tuple[str, str]:
    """Resolve Meta App credentials: prefer platform-level env vars, fallback to user settings."""
    app_id = app_settings.META_APP_ID or (settings.meta_app_id if settings else "")
    app_secret = app_settings.META_APP_SECRET or (settings.meta_app_secret if settings else "")
    return app_id or "", app_secret or ""


@router.get("/auth-url")
async def get_auth_url(request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Get Facebook OAuth authorization URL."""
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    app_id, app_secret = _resolve_app_credentials(settings)
    if not app_id or not app_secret:
        return {"error": "App ID e App Secret precisam estar preenchidos primeiro"}

    redirect_uri = _get_redirect_uri(request)
    service = MetaOAuthService(app_id, app_secret, config_id=app_settings.META_FB_LOGIN_CONFIG_ID)
    url = service.get_auth_url(redirect_uri)
    return {"auth_url": url}


@router.get("/platform-credentials")
async def get_platform_credentials():
    """Check if platform-level Meta credentials are configured (no user auth needed)."""
    return {
        "has_platform_credentials": bool(app_settings.META_APP_ID and app_settings.META_APP_SECRET),
    }


@router.get("/callback")
async def oauth_callback(request: Request, code: str = Query(...), db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Handle OAuth callback - exchange code for token."""
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    app_id, app_secret = _resolve_app_credentials(settings)
    if not app_id or not app_secret:
        return {"error": "Configuracoes incompletas"}

    redirect_uri = _get_redirect_uri(request)
    service = MetaOAuthService(app_id, app_secret, config_id=app_settings.META_FB_LOGIN_CONFIG_ID)

    # Exchange code for token
    result = await service.exchange_code(code, redirect_uri)
    if "error" in result:
        return {"error": result["error"]}

    access_token = result["access_token"]

    # Get user info
    user_info = await service.get_user_info(access_token)

    # Save token and user info
    settings.meta_access_token = access_token
    settings.meta_user_name = user_info.get("name", "")

    # Auto-fetch Facebook Page ID for ad creatives
    pages = await service.get_pages(access_token)
    if pages:
        settings.facebook_page_id = pages[0]["id"]

    # Auto-fetch Ad Account if only one available (or pick first)
    accounts = await service.get_ad_accounts(access_token)
    if accounts:
        settings.meta_ad_account_id = accounts[0]["id"]

    db.commit()

    return {
        "success": True,
        "user_name": user_info.get("name", ""),
        "user_id": user_info.get("id", ""),
    }


@router.get("/accounts")
async def get_ad_accounts(db: Session = Depends(get_db)):
    """List available ad accounts for the authenticated user."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token:
        return {"error": "Nao conectado ao Facebook"}

    service = MetaOAuthService(
        settings.meta_app_id or "", settings.meta_app_secret or ""
    )
    accounts = await service.get_ad_accounts(settings.meta_access_token)

    return {
        "accounts": accounts,
        "selected": settings.meta_ad_account_id or "",
    }


@router.post("/select-account")
async def select_account(data: SelectAccountRequest, db: Session = Depends(get_db)):
    """Save selected ad account."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        return {"error": "Configuracoes nao encontradas"}

    settings.meta_ad_account_id = data.account_id
    db.commit()

    return {"success": True, "account_id": data.account_id}


@router.get("/pages")
async def get_pages(db: Session = Depends(get_db)):
    """List user's Facebook Pages."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token:
        return {"error": "Nao conectado ao Facebook"}

    service = MetaOAuthService(
        settings.meta_app_id or "", settings.meta_app_secret or ""
    )
    pages = await service.get_pages(settings.meta_access_token)
    return {
        "pages": [{"id": p["id"], "name": p["name"]} for p in pages],
        "selected": settings.facebook_page_id or "",
    }


@router.get("/readiness")
async def check_readiness(db: Session = Depends(get_db)):
    """Check Meta Ads readiness: connection, page, payment, etc."""
    settings = db.query(Settings).filter(Settings.id == 1).first()

    result = {
        "has_app_credentials": bool(settings and settings.meta_app_id and settings.meta_app_secret),
        "is_connected": bool(settings and settings.meta_access_token),
        "user_name": (settings.meta_user_name if settings else "") or "",
        "has_ad_account": bool(settings and settings.meta_ad_account_id),
        "ad_account_id": (settings.meta_ad_account_id if settings else "") or "",
        "has_page": bool(settings and settings.facebook_page_id),
        "page_id": (settings.facebook_page_id if settings else "") or "",
        "has_payment": False,
        "payment_error": "",
    }

    # If connected and has ad account, check payment
    if result["is_connected"] and result["has_ad_account"]:
        from app.services.meta_ads import MetaAdsService
        meta = MetaAdsService(
            access_token=settings.meta_access_token,
            ad_account_id=settings.meta_ad_account_id,
        )
        payment_info = await meta.check_payment()
        result["has_payment"] = payment_info.get("has_payment", False)
        result["payment_error"] = payment_info.get("error", "")

    return result


@router.get("/payment-status")
async def get_payment_status(db: Session = Depends(get_db)):
    """Check if the Meta ad account has a payment method configured."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token or not settings.meta_ad_account_id:
        return {"has_payment": False, "error": "Meta Ads nao conectado"}

    from app.services.meta_ads import MetaAdsService
    meta = MetaAdsService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id,
    )
    result = await meta.check_payment()
    return result


@router.post("/reconnect")
async def reconnect(request: Request, db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    """Disconnect and return new OAuth URL for reconnection."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        return {"error": "Configuracoes nao encontradas"}

    # Clear existing connection
    settings.meta_access_token = ""
    settings.meta_ad_account_id = ""
    settings.meta_user_name = ""
    settings.facebook_page_id = ""
    db.commit()

    # Generate new OAuth URL
    if not settings.meta_app_id or not settings.meta_app_secret:
        return {"error": "App ID e App Secret nao configurados"}

    service = MetaOAuthService(settings.meta_app_id, settings.meta_app_secret, config_id=app_settings.META_FB_LOGIN_CONFIG_ID)
    redirect_uri = _get_redirect_uri(request)
    url = service.get_auth_url(redirect_uri)
    return {"success": True, "auth_url": url}


@router.get("/app-mode")
async def get_app_mode(db: Session = Depends(get_db)):
    """Check if the Meta App is in Development or Live mode."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings or not settings.meta_access_token:
        return {"mode": "unknown", "app_id": "", "app_name": "", "error": "Meta Ads nao conectado."}

    if not settings.meta_app_id:
        return {"mode": "unknown", "app_id": "", "app_name": "", "error": "App ID nao configurado."}

    from app.services.meta_ads import MetaAdsService
    meta = MetaAdsService(
        access_token=settings.meta_access_token,
        ad_account_id=settings.meta_ad_account_id or "",
    )
    result = await meta.check_app_mode(app_id=settings.meta_app_id)

    # Persist detected mode in settings
    detected_mode = result.get("mode", "unknown")
    if detected_mode in ("development", "live"):
        settings.meta_app_mode = detected_mode
        db.commit()

    return result


@router.post("/disconnect")
async def disconnect(db: Session = Depends(get_db)):
    """Disconnect Meta account - clear tokens and account info."""
    settings = db.query(Settings).filter(Settings.id == 1).first()
    if not settings:
        return {"error": "Configuracoes nao encontradas"}

    settings.meta_access_token = ""
    settings.meta_ad_account_id = ""
    settings.meta_user_name = ""
    db.commit()

    return {"success": True}
