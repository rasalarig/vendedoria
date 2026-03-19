import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app.api import api_router

# Import models so they are registered with Base before create_all
import app.models  # noqa: F401

# Use absolute path for uploads directory (consistent with products.py)
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_PREFIX)

# Mount uploads directory for serving static files
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.on_event("startup")
async def startup_event():
    Base.metadata.create_all(bind=engine)
    # Migrate: add meta_user_name column if it doesn't exist
    try:
        with engine.connect() as conn:
            conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE settings ADD COLUMN meta_user_name VARCHAR(200) DEFAULT ''"
                )
            )
            conn.commit()
    except Exception:
        pass  # Column already exists
    # Migrate: add facebook_page_id column
    try:
        with engine.connect() as conn:
            conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE settings ADD COLUMN facebook_page_id VARCHAR(100) DEFAULT ''"
                )
            )
            conn.commit()
    except Exception:
        pass
    # Migrate: add meta_creative_id column
    try:
        with engine.connect() as conn:
            conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE campaigns ADD COLUMN meta_creative_id VARCHAR(100)"
                )
            )
            conn.commit()
    except Exception:
        pass
    # Migrate: add meta_errors column
    try:
        with engine.connect() as conn:
            conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE campaigns ADD COLUMN meta_errors TEXT"
                )
            )
            conn.commit()
    except Exception:
        pass
    # Migrate: add meta_pixel_id column
    try:
        with engine.connect() as conn:
            conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE settings ADD COLUMN meta_pixel_id VARCHAR(100) DEFAULT ''"
                )
            )
            conn.commit()
    except Exception:
        pass
    # Migrate: add website_url to products
    try:
        with engine.connect() as conn:
            conn.execute(
                __import__("sqlalchemy").text(
                    "ALTER TABLE products ADD COLUMN website_url VARCHAR(500)"
                )
            )
            conn.commit()
    except Exception:
        pass
