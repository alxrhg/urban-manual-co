"""Configuration settings for ML service."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    postgres_url: str
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None

    # Service
    service_name: str = "urban-manual-ml"
    service_version: str = "1.0.0"
    debug: bool = False

    # ML Models
    model_cache_dir: str = "/tmp/ml_models"
    min_interactions: int = 3  # Minimum interactions for collaborative filtering
    top_destinations_for_forecast: int = 200
    forecast_days: int = 30

    # Performance
    max_recommendations: int = 50
    api_timeout: int = 30

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
