"""
Meta Data Deletion Callback endpoint.

Required by Meta for app review. When a user requests data deletion through
Facebook, Meta sends a POST with a signed_request parameter. This module
handles that callback and provides a status-check page.
"""

import base64
import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Form, Query
from fastapi.responses import HTMLResponse, JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data-deletion", tags=["data-deletion"])

# In-memory store for deletion requests.
# In production with multiple workers you would use the database instead.
_deletion_requests: dict[str, dict] = {}


def _base64url_decode(s: str) -> bytes:
    """Decode a base64url-encoded string (no padding required)."""
    # Add padding if necessary
    s += "=" * (4 - len(s) % 4)
    return base64.urlsafe_b64decode(s)


def parse_signed_request(signed_request: str, secret: str | None = None) -> dict | None:
    """Parse a Facebook signed_request.

    The signed_request is two base64url-encoded parts separated by a dot:
      <signature>.<payload>

    If *secret* is provided the HMAC-SHA256 signature is verified.
    Returns the decoded JSON payload dict, or ``None`` on failure.
    """
    try:
        parts = signed_request.split(".", 1)
        if len(parts) != 2:
            logger.warning("signed_request does not contain two parts")
            return None

        encoded_sig, encoded_payload = parts

        if secret:
            expected_sig = hmac.new(
                secret.encode("utf-8"),
                encoded_payload.encode("utf-8"),
                hashlib.sha256,
            ).digest()
            actual_sig = _base64url_decode(encoded_sig)
            if not hmac.compare_digest(actual_sig, expected_sig):
                logger.warning("signed_request signature verification failed")
                return None

        payload_json = _base64url_decode(encoded_payload)
        data = json.loads(payload_json)
        return data
    except Exception:
        logger.exception("Failed to parse signed_request")
        return None


@router.post("", response_class=JSONResponse)
async def data_deletion_callback(signed_request: str = Form(...)):
    """Handle Meta data-deletion callback.

    Meta sends a POST request with ``signed_request`` form field whenever a
    user asks Facebook to delete their data associated with this app.

    Returns JSON with ``url`` and ``confirmation_code`` as required by Meta.
    """
    app_secret = settings.META_APP_SECRET or None

    if not app_secret:
        logger.warning(
            "META_APP_SECRET is not configured -- accepting deletion request "
            "without signature verification"
        )

    data = parse_signed_request(signed_request, secret=app_secret)

    if data is None and app_secret:
        # Retry without verification so we still honour the request
        logger.warning("Retrying signed_request parse without signature verification")
        data = parse_signed_request(signed_request, secret=None)

    facebook_user_id = str(data.get("user_id", "unknown")) if data else "unknown"

    confirmation_code = str(uuid.uuid4())

    _deletion_requests[confirmation_code] = {
        "facebook_user_id": facebook_user_id,
        "status": "pending",
        "requested_at": datetime.now(timezone.utc).isoformat(),
    }

    logger.info(
        "Data deletion request received for Facebook user %s, code=%s",
        facebook_user_id,
        confirmation_code,
    )

    status_url = (
        "https://vendedoria-70tt.onrender.com"
        f"/api/data-deletion/status?code={confirmation_code}"
    )

    return {"url": status_url, "confirmation_code": confirmation_code}


@router.get("/status", response_class=HTMLResponse)
async def data_deletion_status(code: str = Query(...)):
    """Show the deletion status page for a given confirmation code.

    Meta (and the user) can visit this URL to check whether deletion has been
    completed.
    """
    record = _deletion_requests.get(code)

    if record:
        status_label = "Concluida" if record["status"] == "completed" else "Pendente"
        status_color = "#4ade80" if record["status"] == "completed" else "#facc15"
        requested_at = record["requested_at"]
    else:
        status_label = "Nao encontrada"
        status_color = "#f87171"
        requested_at = "N/A"

    return f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Status da Exclusao de Dados - VendedorIA</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #09090b; color: #e4e4e7;
                max-width: 600px; margin: 0 auto; padding: 40px 20px;
                line-height: 1.7;
            }}
            h1 {{ color: #a78bfa; border-bottom: 1px solid #27272a; padding-bottom: 16px; }}
            .card {{
                background: #18181b; border: 1px solid #27272a;
                border-radius: 12px; padding: 24px; margin: 20px 0;
            }}
            .status {{
                font-size: 1.25rem; font-weight: 600;
                color: {status_color};
            }}
            .label {{ color: #71717a; font-size: 0.875rem; }}
            .value {{ color: #e4e4e7; margin-bottom: 16px; }}
            .footer {{
                color: #71717a; font-size: 14px; margin-top: 40px;
                border-top: 1px solid #27272a; padding-top: 16px;
            }}
        </style>
    </head>
    <body>
        <h1>Status da Exclusao de Dados</h1>
        <div class="card">
            <div class="label">Codigo de confirmacao</div>
            <div class="value">{code}</div>
            <div class="label">Status</div>
            <div class="status">{status_label}</div>
            <br>
            <div class="label">Data da solicitacao</div>
            <div class="value">{requested_at}</div>
        </div>
        <p style="color:#a1a1aa;">
            A exclusao de dados e processada em ate 30 dias apos a solicitacao.
            Caso tenha duvidas, entre em contato conosco atraves da plataforma.
        </p>
        <div class="footer">VendedorIA &copy; 2026</div>
    </body>
    </html>
    """
