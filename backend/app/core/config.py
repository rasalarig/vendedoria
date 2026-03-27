import os

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./vendedor.db"  # Override via .env with PostgreSQL URL
    API_PREFIX: str = "/api"
    PROJECT_NAME: str = "VendedorIA 2026"
    CORS_ORIGINS: list[str] = ["http://localhost:4200", "http://localhost:4201"]
    TOGETHER_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GOOGLE_CLIENT_ID: str = ""
    META_FB_LOGIN_CONFIG_ID: str = "1675802386923357"
    META_APP_ID: str = ""
    META_APP_SECRET: str = ""
    GOOGLE_AI_KEY: str = ""
    JWT_SECRET: str = "vendedoria-secret-key-change-in-production"
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_5: str = ""   # Stripe Price ID for $5 credits
    STRIPE_PRICE_20: str = ""  # Stripe Price ID for $20 credits
    STRIPE_PRICE_50: str = ""  # Stripe Price ID for $50 credits

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Dynamically add Render URL to CORS if available
render_url = os.environ.get("RENDER_EXTERNAL_HOSTNAME")
if render_url:
    settings.CORS_ORIGINS.append(f"https://{render_url}")
