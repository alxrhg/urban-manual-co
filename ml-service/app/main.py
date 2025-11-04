"""Main FastAPI application for ML service."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from datetime import datetime

from app.config import settings
from app.api.endpoints import recommendations, forecasting

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.service_name,
    version=settings.service_version,
    description="Machine Learning microservice for Urban Manual travel recommendations",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.service_name,
        "version": settings.service_version,
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Test database connection
        from app.utils.database import db
        db.execute_query("SELECT 1")

        return {
            "status": "healthy",
            "service": settings.service_name,
            "version": settings.service_version,
            "timestamp": datetime.utcnow().isoformat(),
            "database": "connected"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")


@app.get("/api/health")
async def api_health_check():
    """API health check endpoint (alternative path)."""
    return await health_check()


# Include routers
app.include_router(recommendations.router, prefix="/api/recommend", tags=["recommendations"])
app.include_router(forecasting.router, prefix="/api/forecast", tags=["forecasting"])


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": str(exc) if settings.debug else "An error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
