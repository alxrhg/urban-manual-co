"""Configuration management for ML service."""

from functools import lru_cache
import os

try:
    from pydantic_settings import BaseSettings
except ImportError:  # pragma: no cover - fallback for test environments
    class BaseSettings:
        """Lightweight BaseSettings fallback."""

        def __init__(self, **overrides):
            annotations = getattr(self, '__annotations__', {})
            for field in annotations:
                if field in overrides:
                    value = overrides[field]
                else:
                    env_key = field.upper()
                    default = getattr(self.__class__, field, None)
                    value = os.getenv(env_key, default)
                    if value is None:
                        raise ValueError(f"Missing configuration for '{field}'")
                setattr(self, field, value)


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
    event_cache_ttl_hours: int = 6
    event_lookup_window_days: int = 14
    enable_event_correlation: bool = True
    enable_event_cache: bool = True
    enable_event_destination_analysis: bool = True
    enable_event_traffic_analysis: bool = True

    # Performance
    max_requests_per_minute: int = 60

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
