from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
import uuid
import json
from app.core.database import get_db
from app.models.chat import ChatMessage
from app.models.settings import Settings
from app.services.chat_ai import ChatAIService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("")
async def send_message(
    message: str = Form(...),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Send a message and get AI response."""

    # Handle file upload
    attachment_path = None
    attachment_type = None
    if file:
        upload_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads"
        )
        os.makedirs(upload_dir, exist_ok=True)
        ext = os.path.splitext(file.filename)[1]
        filename = f"chat_{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(upload_dir, filename)
        content = await file.read()
        with open(filepath, "wb") as f:
            f.write(content)
        attachment_path = f"/uploads/{filename}"
        if ext.lower() in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
            attachment_type = "image"
        elif ext.lower() == ".csv":
            attachment_type = "csv"
        else:
            attachment_type = "file"

    # Save user message
    user_msg = ChatMessage(
        role="user",
        content=message,
        attachment_path=attachment_path,
        attachment_type=attachment_type,
    )
    db.add(user_msg)
    db.commit()

    # Get chat history
    history = db.query(ChatMessage).order_by(ChatMessage.created_at.asc()).all()
    history_dicts = []
    for h in history:
        content = h.content
        if h.role == "assistant" and h.action_taken and h.action_data:
            content += f"\n[RESULTADO DA ACAO: {h.action_taken} | dados: {h.action_data}]"
        history_dicts.append({"role": h.role, "content": content})

    # Get AI settings
    settings = db.query(Settings).filter(Settings.id == 1).first()
    ai_key = settings.ai_api_key if settings else ""
    ai_provider = settings.ai_provider if settings else "claude"

    # Check config status for meta and whatsapp
    meta_configured = bool(settings and settings.meta_app_id and settings.meta_access_token and settings.meta_ad_account_id)
    whatsapp_configured = bool(settings and settings.whatsapp_phone_id and settings.whatsapp_token)

    # Load Meta readiness context for the AI
    meta_readiness = {
        "has_app_credentials": bool(settings and settings.meta_app_id and settings.meta_app_secret),
        "is_connected": bool(settings and settings.meta_access_token),
        "user_name": (settings.meta_user_name if settings else "") or "",
        "has_ad_account": bool(settings and settings.meta_ad_account_id),
        "ad_account_id": (settings.meta_ad_account_id if settings else "") or "",
        "has_page": bool(settings and settings.facebook_page_id),
        "has_payment": False,
        "is_prepaid": False,
        "balance": 0,
        "has_sufficient_funds": False,
    }

    # Check payment status if connected (async call)
    if meta_readiness["is_connected"] and meta_readiness["has_ad_account"]:
        from app.services.meta_ads import MetaAdsService
        meta_service = MetaAdsService(
            access_token=settings.meta_access_token,
            ad_account_id=settings.meta_ad_account_id
        )
        payment_info = await meta_service.check_payment()
        meta_readiness["has_payment"] = payment_info.get("has_payment", False)
        meta_readiness["is_prepaid"] = payment_info.get("is_prepaid", False)
        meta_readiness["balance"] = payment_info.get("balance", 0)
        meta_readiness["has_sufficient_funds"] = payment_info.get("has_sufficient_funds", False)

    # Process with AI
    service = ChatAIService(ai_api_key=ai_key, ai_provider=ai_provider, meta_configured=meta_configured, whatsapp_configured=whatsapp_configured, meta_readiness=meta_readiness)
    response_text, action_taken, action_data, ai_fallback, ai_error = await service.process_message(
        message, history_dicts, db, attachment_path
    )

    # Save assistant response
    assistant_msg = ChatMessage(
        role="assistant",
        content=response_text,
        action_taken=action_taken,
        action_data=action_data,
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return {
        "id": assistant_msg.id,
        "role": "assistant",
        "content": response_text,
        "action_taken": action_taken,
        "action_data": json.loads(action_data) if action_data else None,
        "created_at": str(assistant_msg.created_at),
        "ai_fallback": ai_fallback,
        "ai_error": ai_error,
    }


@router.get("/history")
async def get_history(db: Session = Depends(get_db)):
    """Get chat history."""
    messages = db.query(ChatMessage).order_by(ChatMessage.created_at.asc()).all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "attachment_path": m.attachment_path,
            "attachment_type": m.attachment_type,
            "action_taken": m.action_taken,
            "action_data": json.loads(m.action_data) if m.action_data else None,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]


@router.delete("/clear")
async def clear_history(db: Session = Depends(get_db)):
    """Clear all chat history."""
    db.query(ChatMessage).delete()
    db.commit()
    return {"message": "Chat limpo com sucesso"}
