"""Configuration management for ML service."""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service Configuration
    app_name: str = "Urban Manual ML Service"
    app_version: str = "1.0.0"
    log_level: str = "INFO"

    # Supabase Configuration
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # PostgreSQL Direct Connection
    postgres_url: str

    # ML Model Configuration
    lightfm_epochs: int = 50
    lightfm_threads: int = 4
    prophet_seasonality_mode: str = "multiplicative"
    cache_ttl_hours: int = 24
    openai_embedding_model: str = Field("text-embedding-3-large", env="OPENAI_EMBEDDING_MODEL")
    openai_embedding_dimension: int = Field(3072, env="OPENAI_EMBEDDING_DIMENSION")
    topic_model_embedding_model: str = Field("all-MiniLM-L6-v2", env="TOPIC_MODEL_EMBEDDING_MODEL")

    # Performance
    max_requests_per_minute: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
