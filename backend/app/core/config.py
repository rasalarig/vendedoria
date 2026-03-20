import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./vendedor.db"
    API_PREFIX: str = "/api"
    PROJECT_NAME: str = "VendedorIA 2026"
    CORS_ORIGINS: list[str] = ["http://localhost:4200", "http://localhost:4201"]
    TOGETHER_API_KEY: str = "tgp_v1_ucjI9KBkxkfldB69gno2P8GpkFMc9_JLYANhY0P_9VQ"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Dynamically add Render URL to CORS if available
render_url = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if render_url:
    settings.CORS_ORIGINS.append(f"https://{render_url}")
