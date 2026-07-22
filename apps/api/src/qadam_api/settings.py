"""Environment-only runtime configuration."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="QADAM_", env_file=".env", extra="ignore")

    environment: str = "development"
    allowed_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    database_url: str | None = None
    auth_database_path: Path = PROJECT_ROOT / "data" / "qadam-auth.sqlite3"
    auth_session_days: int = 30
    legal_corpus_path: Path = PROJECT_ROOT / "corpus/legal"
    llm_base_url: str | None = None
    llm_api_key: str | None = Field(default=None, repr=False)
    llm_model: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
