"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.utils.database import init_db_pool, close_db_pool
from app.utils.logger import get_logger
from app.api import health, recommendations, forecast

logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    init_db_pool(minconn=2, maxconn=10)
    logger.info("Application started successfully")

    yield

    # Shutdown
    logger.info("Shutting down application")
    close_db_pool()
    logger.info("Application shutdown complete")


# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Machine Learning microservice for Urban Manual travel app",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(recommendations.router, prefix="/api/recommend", tags=["Recommendations"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecasting"])


@app.get("/api")
async def api_root():
    """API root endpoint."""
    return {
        "message": "Urban Manual ML Service API",
        "version": settings.app_version,
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "recommendations": "/api/recommend/collaborative",
            "forecasting": "/api/forecast/demand"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower()
    )
