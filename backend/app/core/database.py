import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from typing import Generator

from app.core.config import settings

# Use persistent disk on Render if available
_db_url = settings.DATABASE_URL
if os.path.exists("/app/data") and _db_url == "sqlite:///./vendedor.db":
    _db_url = "sqlite:////app/data/vendedor.db"

engine = create_engine(
    _db_url,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
