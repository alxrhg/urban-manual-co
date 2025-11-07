"""Main FastAPI application for ML Service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import recommendations, forecast, health, graph_sequencing, insights
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="ML Service for Urban Manual - Collaborative Filtering, Forecasting, Sentiment, Topics, Anomalies & Events"
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
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
app.include_router(forecast.router, prefix="/api/forecast", tags=["Forecasting"])
app.include_router(graph_sequencing.router, prefix="/api/graph", tags=["Graph Sequencing"])
app.include_router(insights.router, prefix="/api", tags=["Phase 3: Advanced Features"])

@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "endpoints": {
            "health": "/api/health",
            "recommendations": "/api/recommendations/collaborative",
            "forecast": "/api/forecast/demand",
            "graph": "/api/graph/suggest-next",
            "sentiment": "/api/sentiment/analyze",
            "topics": "/api/topics/extract",
            "anomaly": "/api/anomaly/destination/{id}",
            "events": "/api/events/recommendations/{city}",
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
