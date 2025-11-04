"""Demand forecasting API endpoints."""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime

from app.models import forecast_model
from app.utils.database import db
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class ForecastResponse(BaseModel):
    """Forecast response model."""
    destination_id: int
    forecast_window: str
    predicted_trend: str
    metadata: Dict[str, Any]


class TrendingDestination(BaseModel):
    """Trending destination model."""
    destination_id: int
    trend_percentage: float
    predicted_views: float
    peak_date: str


class BestVisitTime(BaseModel):
    """Best visit time model."""
    date: str
    day_of_week: str
    predicted_demand: float
    confidence_lower: float
    confidence_upper: float


class TrainingResponse(BaseModel):
    """Training response model."""
    status: str
    message: str
    destinations_trained: int
    trained_at: str


def train_forecasting_background(top_n: int, days_back: int):
    """Background task to train forecasting models."""
    try:
        logger.info("Starting background forecasting model training...")
        forecast_model.train_top_destinations(top_n=top_n, days_back=days_back)
        logger.info("Background forecasting training completed successfully")
    except Exception as e:
        logger.error(f"Background forecasting training failed: {e}", exc_info=True)


@router.post("/train", response_model=TrainingResponse)
async def train_forecasting_models(
    background_tasks: BackgroundTasks,
    top_n: int = Query(200, ge=10, le=500, description="Number of top destinations to train"),
    days_back: int = Query(180, ge=30, le=365, description="Historical days to use"),
    background: bool = Query(False, description="Run training in background")
):
    """
    Train demand forecasting models for top destinations.

    - **top_n**: Number of top destinations by views to train (default: 200)
    - **days_back**: Number of historical days to use for training (default: 180)
    - **background**: Run training asynchronously
    """
    try:
        if background:
            background_tasks.add_task(train_forecasting_background, top_n, days_back)
            return TrainingResponse(
                status="training_started",
                message="Forecasting models training started in background",
                destinations_trained=0,
                trained_at=datetime.utcnow().isoformat()
            )

        # Train synchronously
        logger.info("Starting synchronous forecasting model training...")
        models = forecast_model.train_top_destinations(top_n=top_n, days_back=days_back)

        return TrainingResponse(
            status="success",
            message=f"Successfully trained models for {len(models)} destinations",
            destinations_trained=len(models),
            trained_at=forecast_model.trained_at.isoformat()
        )

    except Exception as e:
        logger.error(f"Forecasting training error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Forecasting training failed: {str(e)}"
        )


@router.get("/demand", response_model=List[ForecastResponse])
async def get_demand_forecasts(
    forecast_days: int = Query(30, ge=7, le=90, description="Days to forecast"),
    store_in_db: bool = Query(True, description="Store forecasts in database")
):
    """
    Generate demand forecasts for all trained destinations.

    - **forecast_days**: Number of days to forecast (default: 30)
    - **store_in_db**: Store results in forecasting_data table
    """
    try:
        if not forecast_model.models:
            raise HTTPException(
                status_code=503,
                detail="Forecasting models not trained yet. Please train the models first."
            )

        logger.info(f"Generating {forecast_days}-day forecasts...")
        forecasts = forecast_model.forecast_all(forecast_days=forecast_days)

        if store_in_db and forecasts:
            logger.info(f"Storing {len(forecasts)} forecasts in database...")
            db.store_forecast_data(forecasts)

        return [
            ForecastResponse(
                destination_id=f['destination_id'],
                forecast_window=f['forecast_window'],
                predicted_trend=f['predicted_trend'],
                metadata=f['metadata']
            )
            for f in forecasts
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Forecasting error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Forecasting failed: {str(e)}"
        )


@router.get("/trending", response_model=List[TrendingDestination])
async def get_trending_destinations(
    min_trend: float = Query(0.15, ge=0.0, le=1.0, description="Minimum trend threshold")
):
    """
    Get currently trending destinations based on forecasts.

    - **min_trend**: Minimum trend percentage threshold (default: 0.15 = 15%)
    """
    try:
        if not forecast_model.forecasts:
            raise HTTPException(
                status_code=503,
                detail="Forecasts not generated yet. Please run demand forecasting first."
            )

        trending = forecast_model.get_trending_destinations(
            min_trend_threshold=min_trend
        )

        return [
            TrendingDestination(
                destination_id=t['destination_id'],
                trend_percentage=t['trend_percentage'],
                predicted_views=t['predicted_views'],
                peak_date=t['peak_date']
            )
            for t in trending
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Trending destinations error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get trending destinations: {str(e)}"
        )


@router.get("/best-time/{destination_id}", response_model=List[BestVisitTime])
async def get_best_visit_times(
    destination_id: int,
    top_n: int = Query(5, ge=1, le=30, description="Number of best times to return")
):
    """
    Get best times to visit a destination (based on predicted low demand).

    - **destination_id**: Destination identifier
    - **top_n**: Number of best times to return (default: 5)
    """
    try:
        if destination_id not in forecast_model.forecasts:
            raise HTTPException(
                status_code=404,
                detail=f"No forecast available for destination {destination_id}"
            )

        best_times = forecast_model.get_best_visit_times(
            destination_id=destination_id,
            top_n=top_n
        )

        return [
            BestVisitTime(
                date=bt['date'],
                day_of_week=bt['day_of_week'],
                predicted_demand=bt['predicted_demand'],
                confidence_lower=bt['confidence_lower'],
                confidence_upper=bt['confidence_upper']
            )
            for bt in best_times
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Best times error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get best visit times: {str(e)}"
        )


@router.get("/status")
async def get_forecasting_status():
    """Get the current status of the forecasting models."""
    if not forecast_model.models:
        return {
            "status": "untrained",
            "message": "Forecasting models have not been trained yet",
            "destinations_count": 0,
            "forecasts_generated": 0,
            "trained_at": None
        }

    return {
        "status": "trained",
        "message": "Forecasting models are ready",
        "destinations_count": len(forecast_model.models),
        "forecasts_generated": len(forecast_model.forecasts),
        "trained_at": forecast_model.trained_at.isoformat() if forecast_model.trained_at else None
    }
