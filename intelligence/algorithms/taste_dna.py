"""
TasteDNA Algorithm

Learns a user's unique taste signature from their behavior.
Outputs a dense vector that represents their preferences.

Key insight: Users have consistent taste patterns that can be learned
from their saves, visits, ratings, and browsing behavior.
"""

import numpy as np
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import pickle
import json
from pathlib import Path

from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

from .base import (
    Algorithm,
    AlgorithmType,
    ModelMetadata,
    Explanation,
    PredictionResult,
    UserContext,
    DestinationSlug,
)


@dataclass
class TasteDNAInput:
    """Input for TasteDNA prediction"""
    user_id: str
    saved_destinations: List[Dict]      # List of saved destinations with metadata
    visited_destinations: List[Dict]    # List of visited destinations with ratings
    interaction_history: List[Dict]     # Recent interactions (views, clicks)
    explicit_preferences: Optional[Dict] = None  # Any stated preferences


@dataclass
class TasteDNAOutput:
    """Output of TasteDNA prediction"""
    taste_vector: List[float]           # 128-dim taste embedding
    taste_archetype: str                # Human-readable archetype
    taste_dimensions: Dict[str, float]  # Interpretable dimensions
    affinity_scores: Dict[str, float]   # Category/style affinities


class TasteDNAAlgorithm(Algorithm[TasteDNAInput, TasteDNAOutput]):
    """
    Learn user taste from behavior.

    Architecture:
    1. Extract features from user's interaction history
    2. Weight by signal strength (visit > save > click > view)
    3. Project into taste space using learned embeddings
    4. Cluster into interpretable archetypes

    Taste Dimensions:
    - adventurousness: Hidden gems vs. proven favorites
    - price_sensitivity: Budget vs. luxury
    - design_sensitivity: Design-forward vs. casual
    - locality: Local spots vs. tourist favorites
    - cuisine_breadth: Diverse vs. focused cuisine preferences
    - social_context: Solo vs. group dining
    - time_preference: Breakfast/lunch/dinner patterns
    """

    TASTE_VECTOR_DIM = 128
    NUM_ARCHETYPES = 12

    # Signal weights (how much each action tells us about taste)
    SIGNAL_WEIGHTS = {
        "visit_with_high_rating": 5.0,
        "visit_with_rating": 3.0,
        "visit": 2.0,
        "save": 2.5,
        "click": 1.0,
        "view": 0.3,
        "search": 0.5,
        "dwell_long": 1.5,
        "dwell_short": 0.2,
    }

    # Interpretable taste dimensions
    TASTE_DIMENSIONS = [
        "adventurousness",
        "price_sensitivity",
        "design_sensitivity",
        "locality_preference",
        "cuisine_breadth",
        "social_preference",
        "time_preference",
        "michelin_affinity",
        "neighborhood_explorer",
        "category_diversity",
    ]

    # Taste archetypes (human-readable clusters)
    ARCHETYPES = {
        0: "The Design Connoisseur",
        1: "The Hidden Gem Hunter",
        2: "The Michelin Chaser",
        3: "The Neighborhood Explorer",
        4: "The Budget Foodie",
        5: "The Luxury Seeker",
        6: "The Coffee Aficionado",
        7: "The Bar Hopper",
        8: "The Cultural Tourist",
        9: "The Local Immersionist",
        10: "The Quick Biter",
        11: "The Special Occasion Planner",
    }

    def __init__(self, version: str = "1.0.0"):
        super().__init__(version)
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=self.TASTE_VECTOR_DIM)
        self.archetype_model = KMeans(n_clusters=self.NUM_ARCHETYPES, random_state=42)
        self.destination_embeddings: Dict[str, np.ndarray] = {}
        self.category_vectors: Dict[str, np.ndarray] = {}

    @property
    def algorithm_type(self) -> AlgorithmType:
        return AlgorithmType.TASTE_DNA

    def train(
        self,
        training_data: Dict[str, Any],
        validation_data: Optional[Dict] = None,
        **kwargs
    ) -> ModelMetadata:
        """
        Train TasteDNA model.

        training_data should contain:
        - users: List of user behavior records
        - destinations: Destination metadata with embeddings
        """
        print(f"[TasteDNA] Training on {len(training_data.get('users', []))} users")

        users = training_data.get("users", [])
        destinations = training_data.get("destinations", [])

        # Build destination embedding lookup
        for dest in destinations:
            if dest.get("embedding"):
                self.destination_embeddings[dest["slug"]] = np.array(dest["embedding"])

        # Build category vectors (average of destinations in category)
        self._build_category_vectors(destinations)

        # Extract features for all users
        user_features = []
        for user in users:
            features = self._extract_user_features(user)
            if features is not None:
                user_features.append(features)

        if len(user_features) < 10:
            print("[TasteDNA] Not enough users for training, using default model")
            self._initialize_default_model()
            return self._create_metadata(len(user_features), {})

        # Convert to numpy array
        X = np.array(user_features)

        # Fit scaler
        X_scaled = self.scaler.fit_transform(X)

        # Fit PCA for dimensionality reduction to taste vector
        self.pca.fit(X_scaled)

        # Transform and fit archetype clusters
        X_taste = self.pca.transform(X_scaled)
        self.archetype_model.fit(X_taste)

        # Calculate metrics
        metrics = {
            "num_users": len(user_features),
            "explained_variance": float(np.sum(self.pca.explained_variance_ratio_)),
            "archetype_inertia": float(self.archetype_model.inertia_),
        }

        self._is_loaded = True
        self.metadata = self._create_metadata(len(user_features), metrics)

        print(f"[TasteDNA] Training complete. Explained variance: {metrics['explained_variance']:.2%}")

        return self.metadata

    def predict(self, input_data: TasteDNAInput) -> PredictionResult[TasteDNAOutput]:
        """Predict user's taste DNA from their behavior"""
        import time
        start = time.time()

        # Extract features
        user_record = {
            "user_id": input_data.user_id,
            "saved_destinations": input_data.saved_destinations,
            "visited_destinations": input_data.visited_destinations,
            "interactions": input_data.interaction_history,
        }

        features = self._extract_user_features(user_record)

        if features is None:
            # Not enough data - return neutral taste
            return self._create_neutral_taste(input_data)

        # Transform to taste vector
        features_scaled = self.scaler.transform([features])
        taste_vector = self.pca.transform(features_scaled)[0]

        # Predict archetype
        archetype_idx = self.archetype_model.predict([taste_vector])[0]
        archetype = self.ARCHETYPES.get(archetype_idx, "The Explorer")

        # Calculate interpretable dimensions
        taste_dimensions = self._calculate_taste_dimensions(user_record, features)

        # Calculate category affinities
        affinity_scores = self._calculate_affinities(user_record)

        output = TasteDNAOutput(
            taste_vector=taste_vector.tolist(),
            taste_archetype=archetype,
            taste_dimensions=taste_dimensions,
            affinity_scores=affinity_scores,
        )

        # Generate explanation
        explanation = self.explain(input_data, output)

        latency = (time.time() - start) * 1000

        return PredictionResult(
            prediction=output,
            confidence=self._calculate_confidence(user_record),
            explanation=explanation,
            latency_ms=latency,
        )

    def explain(self, input_data: TasteDNAInput, prediction: TasteDNAOutput) -> Explanation:
        """Explain how we determined user's taste"""

        # Find top contributing factors
        factors = []

        # Top taste dimensions
        sorted_dims = sorted(
            prediction.taste_dimensions.items(),
            key=lambda x: abs(x[1] - 0.5),  # Distance from neutral
            reverse=True
        )

        for dim, score in sorted_dims[:3]:
            if score > 0.6:
                factors.append({
                    "type": "taste_dimension",
                    "dimension": dim,
                    "score": score,
                    "description": f"High {dim.replace('_', ' ')}: {score:.0%}",
                })
            elif score < 0.4:
                factors.append({
                    "type": "taste_dimension",
                    "dimension": dim,
                    "score": score,
                    "description": f"Low {dim.replace('_', ' ')}: {score:.0%}",
                })

        # Top category affinities
        sorted_affinities = sorted(
            prediction.affinity_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        for category, score in sorted_affinities[:2]:
            if score > 0.3:
                factors.append({
                    "type": "category_affinity",
                    "category": category,
                    "score": score,
                    "description": f"Strong affinity for {category}: {score:.0%}",
                })

        # Build summary
        summary = f"You're \"{prediction.taste_archetype}\" based on {len(input_data.saved_destinations)} saves and {len(input_data.visited_destinations)} visits."

        return Explanation(
            summary=summary,
            factors=factors,
            confidence=self._calculate_confidence({
                "saved_destinations": input_data.saved_destinations,
                "visited_destinations": input_data.visited_destinations,
            }),
        )

    def save(self, path: str) -> None:
        """Save model to disk"""
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)

        # Save sklearn models
        with open(path / "scaler.pkl", "wb") as f:
            pickle.dump(self.scaler, f)
        with open(path / "pca.pkl", "wb") as f:
            pickle.dump(self.pca, f)
        with open(path / "archetype_model.pkl", "wb") as f:
            pickle.dump(self.archetype_model, f)

        # Save embeddings
        np.save(path / "destination_embeddings.npy", self.destination_embeddings)
        np.save(path / "category_vectors.npy", self.category_vectors)

        # Save metadata
        if self.metadata:
            with open(path / "metadata.json", "w") as f:
                json.dump(self.metadata.to_dict(), f)

    def load(self, path: str) -> None:
        """Load model from disk"""
        path = Path(path)

        with open(path / "scaler.pkl", "rb") as f:
            self.scaler = pickle.load(f)
        with open(path / "pca.pkl", "rb") as f:
            self.pca = pickle.load(f)
        with open(path / "archetype_model.pkl", "rb") as f:
            self.archetype_model = pickle.load(f)

        self.destination_embeddings = np.load(
            path / "destination_embeddings.npy",
            allow_pickle=True
        ).item()
        self.category_vectors = np.load(
            path / "category_vectors.npy",
            allow_pickle=True
        ).item()

        self._is_loaded = True

    # =========================================================================
    # PRIVATE METHODS
    # =========================================================================

    def _extract_user_features(self, user: Dict) -> Optional[np.ndarray]:
        """Extract feature vector from user behavior"""

        saved = user.get("saved_destinations", [])
        visited = user.get("visited_destinations", [])
        interactions = user.get("interactions", [])

        # Need minimum activity
        if len(saved) + len(visited) < 3:
            return None

        features = []

        # 1. Category distribution (normalized)
        category_counts = self._count_categories(saved + visited)
        categories = ["restaurant", "hotel", "bar", "cafe", "museum", "shop", "gallery"]
        for cat in categories:
            features.append(category_counts.get(cat, 0) / max(len(saved) + len(visited), 1))

        # 2. Price level distribution
        price_levels = [d.get("price_level", 2) for d in saved + visited if d.get("price_level")]
        if price_levels:
            features.extend([
                np.mean(price_levels) / 4,  # Normalize to 0-1
                np.std(price_levels) / 2 if len(price_levels) > 1 else 0,
            ])
        else:
            features.extend([0.5, 0])

        # 3. Rating preferences
        ratings = [d.get("rating", 0) for d in saved + visited if d.get("rating")]
        if ratings:
            features.extend([
                np.mean(ratings) / 5,
                np.std(ratings) if len(ratings) > 1 else 0,
            ])
        else:
            features.extend([0.8, 0])

        # 4. Michelin affinity
        michelin_count = sum(1 for d in saved + visited if d.get("michelin_stars", 0) > 0)
        features.append(michelin_count / max(len(saved) + len(visited), 1))

        # 5. Design affinity (has architect)
        design_count = sum(1 for d in saved + visited if d.get("architect_name"))
        features.append(design_count / max(len(saved) + len(visited), 1))

        # 6. City diversity
        cities = set(d.get("city", "") for d in saved + visited if d.get("city"))
        features.append(min(len(cities) / 5, 1))  # Cap at 5 cities

        # 7. Engagement depth (visits vs saves ratio)
        if len(saved) > 0:
            features.append(len(visited) / len(saved))
        else:
            features.append(0)

        # 8. Average embedding (if available)
        embeddings = []
        for d in saved + visited:
            slug = d.get("slug", "")
            if slug in self.destination_embeddings:
                embeddings.append(self.destination_embeddings[slug])

        if embeddings:
            avg_embedding = np.mean(embeddings, axis=0)
            # Take first 10 dimensions of average embedding
            features.extend(avg_embedding[:10].tolist())
        else:
            features.extend([0] * 10)

        return np.array(features)

    def _count_categories(self, destinations: List[Dict]) -> Dict[str, int]:
        """Count destinations by category"""
        counts = {}
        for d in destinations:
            cat = d.get("category", "unknown")
            counts[cat] = counts.get(cat, 0) + 1
        return counts

    def _build_category_vectors(self, destinations: List[Dict]) -> None:
        """Build average embedding for each category"""
        category_embeddings: Dict[str, List] = {}

        for dest in destinations:
            cat = dest.get("category", "unknown")
            if dest.get("embedding"):
                if cat not in category_embeddings:
                    category_embeddings[cat] = []
                category_embeddings[cat].append(np.array(dest["embedding"]))

        for cat, embeddings in category_embeddings.items():
            self.category_vectors[cat] = np.mean(embeddings, axis=0)

    def _calculate_taste_dimensions(
        self,
        user: Dict,
        features: np.ndarray
    ) -> Dict[str, float]:
        """Calculate interpretable taste dimensions"""

        saved = user.get("saved_destinations", [])
        visited = user.get("visited_destinations", [])
        all_dests = saved + visited

        dimensions = {}

        # Adventurousness (preference for low-rating-count places)
        popularity_scores = [d.get("views_count", 0) for d in all_dests]
        if popularity_scores:
            avg_popularity = np.mean(popularity_scores)
            dimensions["adventurousness"] = max(0, 1 - (avg_popularity / 1000))
        else:
            dimensions["adventurousness"] = 0.5

        # Price sensitivity
        prices = [d.get("price_level", 2) for d in all_dests if d.get("price_level")]
        dimensions["price_sensitivity"] = 1 - (np.mean(prices) / 4 if prices else 0.5)

        # Design sensitivity
        design_count = sum(1 for d in all_dests if d.get("architect_name"))
        dimensions["design_sensitivity"] = design_count / max(len(all_dests), 1)

        # Locality preference (vs tourist spots)
        # Higher trending = more tourist
        trending = [d.get("trending_score", 0) for d in all_dests]
        if trending:
            dimensions["locality_preference"] = 1 - min(np.mean(trending) / 10, 1)
        else:
            dimensions["locality_preference"] = 0.5

        # Cuisine breadth
        categories = set(d.get("category", "") for d in all_dests)
        dimensions["cuisine_breadth"] = min(len(categories) / 5, 1)

        # Michelin affinity
        michelin = sum(1 for d in all_dests if d.get("michelin_stars", 0) > 0)
        dimensions["michelin_affinity"] = michelin / max(len(all_dests), 1)

        # Neighborhood explorer
        neighborhoods = set(d.get("neighborhood", "") for d in all_dests if d.get("neighborhood"))
        dimensions["neighborhood_explorer"] = min(len(neighborhoods) / 10, 1)

        return dimensions

    def _calculate_affinities(self, user: Dict) -> Dict[str, float]:
        """Calculate category affinities"""
        saved = user.get("saved_destinations", [])
        visited = user.get("visited_destinations", [])

        # Weight visited higher than saved
        weighted_cats = {}
        for d in saved:
            cat = d.get("category", "unknown")
            weighted_cats[cat] = weighted_cats.get(cat, 0) + 1
        for d in visited:
            cat = d.get("category", "unknown")
            weighted_cats[cat] = weighted_cats.get(cat, 0) + 2

        total = sum(weighted_cats.values()) or 1
        return {cat: count / total for cat, count in weighted_cats.items()}

    def _calculate_confidence(self, user: Dict) -> float:
        """Calculate confidence based on amount of data"""
        saved = len(user.get("saved_destinations", []))
        visited = len(user.get("visited_destinations", []))
        total = saved + visited

        # More data = higher confidence
        # 3 items = 0.3, 10 items = 0.7, 30+ items = 0.95
        return min(0.3 + (total * 0.02), 0.95)

    def _create_neutral_taste(self, input_data: TasteDNAInput) -> PredictionResult[TasteDNAOutput]:
        """Return neutral taste for users with insufficient data"""
        output = TasteDNAOutput(
            taste_vector=[0.0] * self.TASTE_VECTOR_DIM,
            taste_archetype="The Explorer",
            taste_dimensions={dim: 0.5 for dim in self.TASTE_DIMENSIONS},
            affinity_scores={},
        )

        return PredictionResult(
            prediction=output,
            confidence=0.1,
            explanation=Explanation(
                summary="Not enough data to determine your taste yet. Save or visit more places!",
                factors=[],
                confidence=0.1,
            ),
        )

    def _initialize_default_model(self) -> None:
        """Initialize with default parameters when training data is insufficient"""
        # Create dummy data to fit sklearn models
        dummy_features = np.random.randn(100, 25)  # Match feature count
        self.scaler.fit(dummy_features)
        dummy_scaled = self.scaler.transform(dummy_features)
        self.pca.fit(dummy_scaled)
        dummy_taste = self.pca.transform(dummy_scaled)
        self.archetype_model.fit(dummy_taste)
        self._is_loaded = True

    def _create_metadata(self, num_samples: int, metrics: Dict) -> ModelMetadata:
        """Create model metadata"""
        return ModelMetadata(
            algorithm_type=self.algorithm_type,
            version=self.version,
            trained_at=datetime.utcnow(),
            training_samples=num_samples,
            metrics=metrics,
            hyperparameters={
                "taste_vector_dim": self.TASTE_VECTOR_DIM,
                "num_archetypes": self.NUM_ARCHETYPES,
                "signal_weights": self.SIGNAL_WEIGHTS,
            },
        )


# Convenience function for Modal
def get_taste_dna_model(version: str = "1.0.0") -> TasteDNAAlgorithm:
    """Get or create TasteDNA model instance"""
    return TasteDNAAlgorithm(version=version)
