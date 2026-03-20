from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from jose import jwt
from datetime import datetime, timedelta
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import os

from app.core.database import get_db
from app.core.auth import get_current_user_id
from app.core.config import settings as app_settings
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_KEY = os.environ.get("JWT_SECRET", "vendedoria-secret-key-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 72


class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token
    client_id: str   # Google Client ID (for verification)


class AuthResponse(BaseModel):
    token: str
    user: dict


def create_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@router.get("/google-client-id")
async def get_google_client_id():
    client_id = app_settings.GOOGLE_CLIENT_ID
    return {"client_id": client_id}


@router.post("/google")
async def google_login(data: GoogleLoginRequest, db: Session = Depends(get_db)):
    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            data.client_id,
        )
        email = idinfo.get("email")
        name = idinfo.get("name", email)
        avatar = idinfo.get("picture", "")
        google_id = idinfo.get("sub")

        if not email:
            raise HTTPException(status_code=400, detail="Email not found in Google token")

        # Find or create user
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(email=email, name=name, avatar_url=avatar, google_id=google_id)
            db.add(user)
            db.commit()
            db.refresh(user)
            # Create default settings for new user
            from app.models.settings import Settings
            default_settings = Settings(user_id=user.id)
            db.add(default_settings)
            db.commit()
        else:
            # Update name/avatar
            user.name = name
            user.avatar_url = avatar
            db.commit()

        token = create_token(user.id, user.email)
        return {
            "token": token,
            "user": {"id": user.id, "email": user.email, "name": user.name, "avatar_url": user.avatar_url},
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")


@router.get("/me")
async def get_me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": user.id, "email": user.email, "name": user.name, "avatar_url": user.avatar_url}
