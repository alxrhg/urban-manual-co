"""Health check endpoint."""

from datetime import datetime
from typing import Dict

from fastapi import APIRouter
from pydantic import BaseModel
import psycopg2

from app.config import get_settings
from app.utils.database import get_db_connection
from app.utils.logger import get_logger
from app.utils.model_registry import GRAPH_MODEL_ARTIFACT, model_registry

router = APIRouter()
logger = get_logger(__name__)
settings = get_settings()


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    service: str
    version: str
    database: str


class ReadinessResponse(BaseModel):
    """Readiness check response."""
    status: str
    timestamp: str
    service: str
    version: str
    dependencies: Dict[str, str]


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """
    Health check endpoint.

    Returns service status and database connectivity.
    """
    db_status = "disconnected"

    # Check database connection
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
                if result and result[0] == 1:
                    db_status = "connected"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = f"error: {str(e)[:50]}"

    return HealthResponse(
        status="healthy" if db_status == "connected" else "unhealthy",
        timestamp=datetime.utcnow().isoformat(),
        service=settings.app_name,
        version=settings.app_version,
        database=db_status
    )


@router.get("/readiness", response_model=ReadinessResponse, tags=["Health"])
async def readiness_check():
    """Readiness endpoint for orchestrators."""
    db_ready = False
    db_status = "disconnected"
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                if cur.fetchone():
                    db_ready = True
                    db_status = "connected"
    except Exception as exc:
        db_status = f"error: {str(exc)[:60]}"
        logger.error("Readiness DB check failed: %s", exc)

    graph_ready = model_registry.exists(GRAPH_MODEL_ARTIFACT)
    overall_status = "ready" if db_ready and graph_ready else "degraded" if db_ready else "unhealthy"

    return ReadinessResponse(
        status=overall_status,
        timestamp=datetime.utcnow().isoformat(),
        service=settings.app_name,
        version=settings.app_version,
        dependencies={
            "database": db_status,
            "graph_model": "ready" if graph_ready else "unavailable",
        },
    )


@router.get("/", tags=["Health"])
async def root():
    """Root endpoint with service information."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }
    }
