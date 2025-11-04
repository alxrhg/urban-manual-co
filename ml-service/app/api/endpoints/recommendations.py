"""Recommendations API endpoints."""
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel
from typing import List, Optional
import logging
from datetime import datetime

from app.models import cf_model
from app.utils.database import db
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class RecommendationResponse(BaseModel):
    """Recommendation response model."""
    destination_id: int
    score: float
    reason: str = "collaborative_filtering"


class BulkRecommendationResponse(BaseModel):
    """Bulk recommendation response."""
    total_recommendations: int
    users_processed: int
    stored_in_database: bool
    generated_at: str


class TrainingResponse(BaseModel):
    """Training response model."""
    status: str
    message: str
    users_count: int
    destinations_count: int
    trained_at: str


def train_model_background():
    """Background task to train the model."""
    try:
        logger.info("Starting background model training...")
        cf_model.train(epochs=30)
        logger.info("Background training completed successfully")
    except Exception as e:
        logger.error(f"Background training failed: {e}", exc_info=True)


@router.post("/train", response_model=TrainingResponse)
async def train_model(
    background_tasks: BackgroundTasks,
    background: bool = Query(False, description="Run training in background"),
    epochs: int = Query(30, ge=1, le=100, description="Number of training epochs")
):
    """
    Train the collaborative filtering model.

    - **background**: If True, training runs asynchronously
    - **epochs**: Number of training epochs (default: 30)
    """
    try:
        if background:
            background_tasks.add_task(train_model_background)
            return TrainingResponse(
                status="training_started",
                message="Model training started in background",
                users_count=0,
                destinations_count=0,
                trained_at=datetime.utcnow().isoformat()
            )

        # Train synchronously
        logger.info("Starting synchronous model training...")
        cf_model.train(epochs=epochs)

        return TrainingResponse(
            status="success",
            message="Model trained successfully",
            users_count=len(cf_model.user_id_map),
            destinations_count=len(cf_model.destination_id_map),
            trained_at=cf_model.trained_at.isoformat()
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Training error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/collaborative/{user_id}", response_model=List[RecommendationResponse])
async def get_collaborative_recommendations(
    user_id: str,
    top_n: int = Query(20, ge=1, le=100, description="Number of recommendations"),
    exclude_interacted: bool = Query(True, description="Exclude already visited/saved items")
):
    """
    Get collaborative filtering recommendations for a specific user.

    - **user_id**: User identifier
    - **top_n**: Number of recommendations to return (default: 20)
    - **exclude_interacted**: Exclude items user has already interacted with
    """
    try:
        if cf_model.model is None:
            raise HTTPException(
                status_code=503,
                detail="Model not trained yet. Please train the model first."
            )

        recommendations = cf_model.predict_for_user(
            user_id=user_id,
            top_n=top_n,
            exclude_interacted=exclude_interacted
        )

        if not recommendations:
            logger.warning(f"No recommendations found for user {user_id}")
            return []

        return [
            RecommendationResponse(
                destination_id=rec['destination_id'],
                score=rec['score'],
                reason='collaborative_filtering'
            )
            for rec in recommendations
        ]

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating recommendations for user {user_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


@router.post("/collaborative/bulk", response_model=BulkRecommendationResponse)
async def generate_bulk_recommendations(
    background_tasks: BackgroundTasks,
    top_n: int = Query(50, ge=1, le=100, description="Recommendations per user"),
    store_in_db: bool = Query(True, description="Store results in database"),
    background: bool = Query(False, description="Run in background")
):
    """
    Generate recommendations for all users and optionally store in database.

    - **top_n**: Number of recommendations per user
    - **store_in_db**: Store results in personalization_scores table
    - **background**: Run asynchronously
    """
    def bulk_generation():
        try:
            if cf_model.model is None:
                logger.error("Model not trained for bulk generation")
                return

            logger.info("Starting bulk recommendation generation...")
            recommendations = cf_model.predict_for_all_users(top_n=top_n)

            if store_in_db and recommendations:
                logger.info(f"Storing {len(recommendations)} recommendations in database...")
                db.store_recommendation_scores(recommendations)

            logger.info("Bulk generation completed successfully")

        except Exception as e:
            logger.error(f"Bulk generation failed: {e}", exc_info=True)

    try:
        if cf_model.model is None:
            raise HTTPException(
                status_code=503,
                detail="Model not trained yet. Please train the model first."
            )

        if background:
            background_tasks.add_task(bulk_generation)
            return BulkRecommendationResponse(
                total_recommendations=0,
                users_processed=0,
                stored_in_database=store_in_db,
                generated_at=datetime.utcnow().isoformat()
            )

        # Run synchronously
        recommendations = cf_model.predict_for_all_users(top_n=top_n)

        if store_in_db and recommendations:
            db.store_recommendation_scores(recommendations)

        unique_users = len(set(r['user_id'] for r in recommendations))

        return BulkRecommendationResponse(
            total_recommendations=len(recommendations),
            users_processed=unique_users,
            stored_in_database=store_in_db,
            generated_at=datetime.utcnow().isoformat()
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Bulk generation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Bulk generation failed: {str(e)}"
        )


@router.get("/status")
async def get_model_status():
    """Get the current status of the collaborative filtering model."""
    if cf_model.model is None:
        return {
            "status": "untrained",
            "message": "Model has not been trained yet",
            "users_count": 0,
            "destinations_count": 0,
            "trained_at": None
        }

    return {
        "status": "trained",
        "message": "Model is ready",
        "users_count": len(cf_model.user_id_map),
        "destinations_count": len(cf_model.destination_id_map),
        "trained_at": cf_model.trained_at.isoformat() if cf_model.trained_at else None
    }
