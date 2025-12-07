"""
Intelligence API Endpoints

Modal web endpoints that expose the algorithms.
These are called by the Next.js app.
"""

import modal
from datetime import datetime
from typing import Dict, List, Optional, Any
import json
import os

from intelligence.modal_app import app, base_image, model_volume, secrets
from intelligence.algorithms.taste_dna import TasteDNAAlgorithm, TasteDNAInput

# ============================================
# DATABASE CONNECTION
# ============================================

def get_supabase_client():
    """Create Supabase client from environment"""
    from supabase import create_client
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise ValueError("Supabase credentials not configured")
    return create_client(url, key)


# ============================================
# TASTE DNA ENDPOINTS
# ============================================

@app.cls(
    image=base_image,
    secrets=[secrets],
    volumes={"/models": model_volume},
)
class TasteDNAService:
    """TasteDNA prediction service"""

    def __init__(self):
        self.model: Optional[TasteDNAAlgorithm] = None

    @modal.enter()
    def load_model(self):
        """Load model on container start"""
        self.model = TasteDNAAlgorithm(version="1.0.0")
        try:
            self.model.load("/models/taste_dna")
            print("[TasteDNA] Loaded model from volume")
        except Exception as e:
            print(f"[TasteDNA] No saved model, will initialize on first training: {e}")
            self.model._initialize_default_model()

    @modal.method()
    def predict(self, user_id: str) -> Dict[str, Any]:
        """
        Predict user's taste DNA.

        Args:
            user_id: User ID to predict for

        Returns:
            TasteDNA prediction with explanation
        """
        # Fetch user data from Supabase
        supabase = get_supabase_client()

        # Get saved places
        saved_response = supabase.table("saved_places").select(
            "destination_slug, destinations(id, name, city, category, price_level, rating, michelin_stars, architect_name, trending_score, views_count)"
        ).eq("user_id", user_id).execute()

        saved = [
            {
                "slug": s["destination_slug"],
                **(s.get("destinations") or {})
            }
            for s in (saved_response.data or [])
        ]

        # Get visited places
        visited_response = supabase.table("visited_places").select(
            "destination_slug, rating, destinations(id, name, city, category, price_level, rating, michelin_stars, architect_name, trending_score, views_count)"
        ).eq("user_id", user_id).execute()

        visited = [
            {
                "slug": v["destination_slug"],
                "user_rating": v.get("rating"),
                **(v.get("destinations") or {})
            }
            for v in (visited_response.data or [])
        ]

        # Get recent interactions
        interactions_response = supabase.table("user_interactions").select(
            "interaction_type, destination_id, engagement_score, context, created_at"
        ).eq("user_id", user_id).order(
            "created_at", desc=True
        ).limit(100).execute()

        interactions = interactions_response.data or []

        # Build input
        input_data = TasteDNAInput(
            user_id=user_id,
            saved_destinations=saved,
            visited_destinations=visited,
            interaction_history=interactions,
        )

        # Predict
        result = self.model.predict(input_data)

        return {
            "success": True,
            "data": {
                "taste_vector": result.prediction.taste_vector,
                "archetype": result.prediction.taste_archetype,
                "dimensions": result.prediction.taste_dimensions,
                "affinities": result.prediction.affinity_scores,
                "confidence": result.confidence,
                "explanation": result.explanation.summary,
            },
            "latency_ms": result.latency_ms,
        }

    @modal.method()
    def train(self, days: int = 90) -> Dict[str, Any]:
        """
        Train TasteDNA model on all user data.

        Args:
            days: Number of days of historical data to use

        Returns:
            Training metrics
        """
        supabase = get_supabase_client()

        # Fetch all users with activity
        users_response = supabase.table("saved_places").select(
            "user_id"
        ).execute()

        user_ids = list(set(u["user_id"] for u in (users_response.data or [])))
        print(f"[TasteDNA] Training on {len(user_ids)} users")

        # Build training data
        users_data = []
        for user_id in user_ids[:1000]:  # Limit for now
            try:
                # Get saved
                saved = supabase.table("saved_places").select(
                    "destination_slug, destinations(*)"
                ).eq("user_id", user_id).execute()

                # Get visited
                visited = supabase.table("visited_places").select(
                    "destination_slug, rating, destinations(*)"
                ).eq("user_id", user_id).execute()

                users_data.append({
                    "user_id": user_id,
                    "saved_destinations": [
                        {"slug": s["destination_slug"], **(s.get("destinations") or {})}
                        for s in (saved.data or [])
                    ],
                    "visited_destinations": [
                        {"slug": v["destination_slug"], "user_rating": v.get("rating"), **(v.get("destinations") or {})}
                        for v in (visited.data or [])
                    ],
                })
            except Exception as e:
                print(f"[TasteDNA] Error fetching user {user_id}: {e}")

        # Fetch destination embeddings
        dest_response = supabase.table("destinations").select(
            "slug, embedding, category, city, price_level, rating, michelin_stars, architect_name"
        ).not_.is_("embedding", "null").execute()

        destinations = dest_response.data or []

        # Train
        training_data = {
            "users": users_data,
            "destinations": destinations,
        }

        metadata = self.model.train(training_data)

        # Save model
        self.model.save("/models/taste_dna")
        model_volume.commit()

        return {
            "success": True,
            "data": {
                "trained_users": metadata.training_samples,
                "metrics": metadata.metrics,
                "version": metadata.version,
                "trained_at": metadata.trained_at.isoformat(),
            },
        }

    @modal.method()
    def get_similar_users(self, user_id: str, top_n: int = 10) -> Dict[str, Any]:
        """Find users with similar taste"""
        # Get this user's taste vector
        result = self.predict(user_id)
        if not result["success"]:
            return result

        user_taste = result["data"]["taste_vector"]

        # This would compare against other users' taste vectors
        # For now, return placeholder
        return {
            "success": True,
            "data": {
                "similar_users": [],  # Would be populated with user IDs
                "note": "Similar user finding requires taste vectors for all users",
            },
        }


# ============================================
# FORECASTER ENDPOINTS
# ============================================

@app.cls(
    image=base_image,
    secrets=[secrets],
    volumes={"/models": model_volume},
)
class ForecasterService:
    """Demand forecasting service"""

    @modal.method()
    def get_trending(self, city: Optional[str] = None, top_n: int = 20) -> Dict[str, Any]:
        """Get trending destinations"""
        supabase = get_supabase_client()

        query = supabase.table("destinations").select(
            "slug, name, city, category, trending_score, views_count, saves_count"
        ).order("trending_score", desc=True).limit(top_n)

        if city:
            query = query.ilike("city", f"%{city}%")

        response = query.execute()

        return {
            "success": True,
            "data": {
                "trending": response.data or [],
                "city": city,
                "as_of": datetime.utcnow().isoformat(),
            },
        }

    @modal.method()
    def get_peak_times(self, destination_slug: str) -> Dict[str, Any]:
        """Get peak times for a destination"""
        # This would use the Prophet model from ml-service
        # For now, return heuristic-based estimate
        return {
            "success": True,
            "data": {
                "destination": destination_slug,
                "best_times": [
                    {"day": "Tuesday", "time": "10:00-11:00"},
                    {"day": "Wednesday", "time": "10:00-11:00"},
                ],
                "worst_times": [
                    {"day": "Saturday", "time": "12:00-14:00"},
                    {"day": "Sunday", "time": "12:00-14:00"},
                ],
                "note": "Estimates based on category patterns",
            },
        }


# ============================================
# RANKER ENDPOINTS
# ============================================

@app.cls(
    image=base_image,
    secrets=[secrets],
    volumes={"/models": model_volume},
)
class RankerService:
    """Personalized ranking service"""

    @modal.method()
    def rank_for_user(
        self,
        user_id: str,
        destination_slugs: List[str]
    ) -> Dict[str, Any]:
        """
        Rank destinations for a specific user.

        Uses TasteDNA + destination features to personalize.
        """
        # Get user's taste
        taste_service = TasteDNAService()
        taste_result = taste_service.predict(user_id)

        if not taste_result["success"]:
            # Fall back to default ranking
            return {
                "success": True,
                "data": {
                    "ranked": destination_slugs,
                    "note": "Default ranking (no user data)",
                },
            }

        taste = taste_result["data"]

        # Fetch destination data
        supabase = get_supabase_client()
        dest_response = supabase.table("destinations").select(
            "slug, category, price_level, rating, michelin_stars, architect_name, trending_score"
        ).in_("slug", destination_slugs).execute()

        destinations = {d["slug"]: d for d in (dest_response.data or [])}

        # Score each destination based on taste match
        scored = []
        for slug in destination_slugs:
            dest = destinations.get(slug, {})
            score = self._score_destination(dest, taste)
            scored.append({"slug": slug, "score": score})

        # Sort by score
        scored.sort(key=lambda x: x["score"], reverse=True)

        return {
            "success": True,
            "data": {
                "ranked": [s["slug"] for s in scored],
                "scores": {s["slug"]: s["score"] for s in scored},
                "user_archetype": taste["archetype"],
            },
        }

    def _score_destination(self, dest: Dict, taste: Dict) -> float:
        """Score a destination based on user taste"""
        score = 0.5  # Base score

        dimensions = taste.get("dimensions", {})
        affinities = taste.get("affinities", {})

        # Category affinity
        category = dest.get("category", "unknown")
        if category in affinities:
            score += affinities[category] * 0.3

        # Price alignment
        price_level = dest.get("price_level", 2)
        price_sensitivity = dimensions.get("price_sensitivity", 0.5)
        # High sensitivity = prefers low prices
        if price_sensitivity > 0.6 and price_level <= 2:
            score += 0.1
        elif price_sensitivity < 0.4 and price_level >= 3:
            score += 0.1

        # Design affinity
        if dest.get("architect_name") and dimensions.get("design_sensitivity", 0) > 0.5:
            score += 0.15

        # Michelin affinity
        if dest.get("michelin_stars", 0) > 0 and dimensions.get("michelin_affinity", 0) > 0.3:
            score += 0.15

        # Trending boost for adventurous users
        if dest.get("trending_score", 0) < 5 and dimensions.get("adventurousness", 0) > 0.6:
            score += 0.1  # Hidden gem

        return min(score, 1.0)


# ============================================
# WEB ENDPOINTS (HTTP)
# ============================================

@app.function(image=base_image, secrets=[secrets])
@modal.web_endpoint(method="POST")
def predict_taste(request: Dict) -> Dict:
    """HTTP endpoint for taste prediction"""
    user_id = request.get("user_id")
    if not user_id:
        return {"success": False, "error": "user_id required"}

    service = TasteDNAService()
    return service.predict.remote(user_id)


@app.function(image=base_image, secrets=[secrets])
@modal.web_endpoint(method="POST")
def rank_destinations(request: Dict) -> Dict:
    """HTTP endpoint for personalized ranking"""
    user_id = request.get("user_id")
    destinations = request.get("destinations", [])

    if not user_id:
        return {"success": False, "error": "user_id required"}
    if not destinations:
        return {"success": False, "error": "destinations list required"}

    service = RankerService()
    return service.rank_for_user.remote(user_id, destinations)


@app.function(image=base_image, secrets=[secrets])
@modal.web_endpoint(method="GET")
def get_trending(city: Optional[str] = None, top_n: int = 20) -> Dict:
    """HTTP endpoint for trending destinations"""
    service = ForecasterService()
    return service.get_trending.remote(city, top_n)


@app.function(image=base_image, secrets=[secrets])
@modal.web_endpoint(method="POST")
def train_taste_dna(request: Dict) -> Dict:
    """HTTP endpoint to trigger TasteDNA training"""
    # This should be protected (admin only)
    days = request.get("days", 90)

    service = TasteDNAService()
    return service.train.remote(days)


# ============================================
# HEALTH CHECK
# ============================================

@app.function(image=base_image)
@modal.web_endpoint(method="GET")
def health() -> Dict:
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "urban-manual-intelligence",
        "timestamp": datetime.utcnow().isoformat(),
        "algorithms": ["taste_dna", "forecaster", "ranker"],
    }
