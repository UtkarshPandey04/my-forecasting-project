from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Literal
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    APP_MODE: Literal["LIVE", "DEMO"] = "DEMO"
    DATABASE_URL: str = "sqlite:///./data/aerosense.db"
    CPCB_API_KEY: str = ""
    WAQI_API_TOKEN: str = "demo"
    FIRMS_MAP_KEY: str = ""
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    AI_MODEL_NAME: str = "gemini-2.0-flash"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:3000"
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=[BACKEND_DIR.parent / ".env", BACKEND_DIR / ".env"], extra="ignore")

@lru_cache
def get_settings() -> Settings:
    return Settings()
