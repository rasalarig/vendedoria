from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./vendedor.db"
    API_PREFIX: str = "/api"
    PROJECT_NAME: str = "VendedorIA 2026"
    CORS_ORIGINS: list[str] = ["http://localhost:4200", "http://localhost:4201"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
