from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os

security = HTTPBearer(auto_error=False)

SECRET_KEY = os.environ.get("JWT_SECRET", "vendedoria-secret-key-change-in-production")
ALGORITHM = "HS256"


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub", 0))
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_optional_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Returns user_id or 0 if not authenticated (for backward compat during migration)."""
    if not credentials:
        return 0
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get("sub", 0))
    except JWTError:
        return 0
