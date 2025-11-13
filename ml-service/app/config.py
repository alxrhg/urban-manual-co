"""Configuration management for ML service."""

from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Service Configuration
    app_name: str = "Urban Manual ML Service"
    app_version: str = "1.0.0"
    log_level: str = "INFO"
    model_storage_path: str = "/app/storage/models"
    contracts_dir: Optional[str] = None

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

    # Performance
    max_requests_per_minute: int = 60
    latency_alert_threshold_ms: int = Field(1200, description="Request latency threshold for alerts")
    error_alert_threshold_per_minute: int = Field(5, description="Error count per minute before alerting")

    # Observability / Telemetry
    otlp_endpoint: Optional[str] = Field(
        default=None,
        description="OTLP HTTP endpoint for OpenTelemetry exporters"
    )

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
