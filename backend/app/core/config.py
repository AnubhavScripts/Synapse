from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/reachiq"
    GEMINI_API_KEY: str = ""
    GATEWAY_DISPATCH_URL: str = "http://localhost:8001/gateway/dispatch"
    CRM_CALLBACK_URL: str = "http://localhost:8000/api/campaigns/callback"

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
