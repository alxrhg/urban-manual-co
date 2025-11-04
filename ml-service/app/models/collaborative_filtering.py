"""Collaborative filtering model using LightFM."""

import numpy as np
import pandas as pd
from lightfm import LightFM
from lightfm.data import Dataset
from scipy.sparse import csr_matrix
from typing import Dict, List, Tuple, Optional
from datetime import datetime

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class CollaborativeFilteringModel:
    """
    LightFM-based collaborative filtering for destination recommendations.

    Combines user-item interactions with user and item features for hybrid
    recommendations.
    """

    def __init__(self):
        """Initialize the collaborative filtering model."""
        self.model = None
        self.dataset = None
        self.user_id_map = {}
        self.item_id_map = {}
        self.reverse_item_map = {}
        self.user_features_matrix = None
        self.item_features_matrix = None
        self.trained_at = None

    def prepare_data(self) -> Tuple[csr_matrix, csr_matrix, csr_matrix]:
        """
        Prepare data for training.

        Returns:
            Tuple of (interactions_matrix, user_features_matrix, item_features_matrix)
        """
        logger.info("Preparing data for collaborative filtering")

        # Fetch data
        interactions_df = DataFetcher.fetch_user_interactions()
        user_features_df = DataFetcher.fetch_user_features()
        item_features_df = DataFetcher.fetch_destination_features()

        # Check if we have enough data
        if len(interactions_df) < 10:
            logger.warning("Not enough interaction data for training")
            return None, None, None

        # Initialize dataset
        self.dataset = Dataset()

        # Get unique users and items
        unique_users = interactions_df['user_id'].unique()
        unique_items = interactions_df['destination_id'].unique()

        logger.info(f"Building dataset with {len(unique_users)} users and {len(unique_items)} items")

        # Build user features
        user_feature_list = []
        for _, row in user_features_df.iterrows():
            features = []

            # Add favorite cities
            if row['favorite_cities']:
                for city in row['favorite_cities']:
                    features.append(f"city:{city}")

            # Add favorite categories
            if row['favorite_categories']:
                for cat in row['favorite_categories']:
                    features.append(f"category:{cat}")

            # Add price preference
            if pd.notna(row['price_preference']):
                features.append(f"price_pref:{int(row['price_preference'])}")

            # Add travel style
            if row['travel_style']:
                features.append(f"style:{row['travel_style']}")

            user_feature_list.append(features)

        # Build item features
        item_feature_list = []
        for _, row in item_features_df.iterrows():
            features = [
                f"city:{row['city']}",
                f"category:{row['category']}",
                f"price:{int(row['price_level'])}",
            ]

            # Add michelin stars
            if row['michelin_stars'] > 0:
                features.append(f"michelin:{int(row['michelin_stars'])}")

            # Add crown badge
            if row['crown']:
                features.append("crown:true")

            # Add tags
            if row['tags']:
                for tag in row['tags'][:3]:  # Limit to top 3 tags
                    features.append(f"tag:{tag}")

            item_feature_list.append(features)

        # Flatten feature lists
        all_user_features = set()
        for features in user_feature_list:
            all_user_features.update(features)

        all_item_features = set()
        for features in item_feature_list:
            all_item_features.update(features)

        # Fit dataset
        self.dataset.fit(
            users=unique_users,
            items=unique_items,
            user_features=list(all_user_features),
            item_features=list(all_item_features)
        )

        # Build interactions matrix
        interactions_list = [
            (row['user_id'], row['destination_id'], row['weight'])
            for _, row in interactions_df.iterrows()
        ]

        interactions_matrix, _ = self.dataset.build_interactions(interactions_list)

        # Build features matrices
        user_features_map = dict(zip(user_features_df['user_id'], user_feature_list))
        user_features_input = [
            (user_id, user_features_map.get(user_id, []))
            for user_id in unique_users
        ]

        item_features_map = dict(zip(item_features_df['id'], item_feature_list))
        item_features_input = [
            (item_id, item_features_map.get(item_id, []))
            for item_id in unique_items
        ]

        user_features_matrix = self.dataset.build_user_features(user_features_input)
        item_features_matrix = self.dataset.build_item_features(item_features_input)

        # Store mappings
        self.user_id_map = self.dataset.mapping()[0]
        self.item_id_map = self.dataset.mapping()[2]
        self.reverse_item_map = {v: k for k, v in self.item_id_map.items()}

        logger.info(f"Data preparation complete. Interactions matrix shape: {interactions_matrix.shape}")

        return interactions_matrix, user_features_matrix, item_features_matrix

    def train(self, epochs: Optional[int] = None, num_threads: Optional[int] = None):
        """
        Train the LightFM model.

        Args:
            epochs: Number of training epochs (default from settings)
            num_threads: Number of threads for training (default from settings)
        """
        logger.info("Training collaborative filtering model")

        epochs = epochs or settings.lightfm_epochs
        num_threads = num_threads or settings.lightfm_threads

        # Prepare data
        interactions, user_features, item_features = self.prepare_data()

        if interactions is None:
            logger.error("Cannot train model: insufficient data")
            return False

        # Initialize model
        # Using WARP (Weighted Approximate-Rank Pairwise) loss for implicit feedback
        self.model = LightFM(
            loss='warp',
            no_components=32,  # Embedding dimension
            learning_rate=0.05,
            random_state=42
        )

        # Store feature matrices
        self.user_features_matrix = user_features
        self.item_features_matrix = item_features

        # Train model
        try:
            self.model.fit(
                interactions,
                user_features=user_features,
                item_features=item_features,
                epochs=epochs,
                num_threads=num_threads,
                verbose=True
            )

            self.trained_at = datetime.utcnow()
            logger.info(f"Model training complete. Trained at {self.trained_at}")
            return True

        except Exception as e:
            logger.error(f"Error training model: {e}")
            return False

    def predict_for_user(
        self,
        user_id: str,
        top_n: int = 10,
        exclude_ids: Optional[List[int]] = None
    ) -> List[Dict]:
        """
        Generate recommendations for a specific user.

        Args:
            user_id: User ID to generate recommendations for
            top_n: Number of recommendations to return
            exclude_ids: List of destination IDs to exclude (already visited/saved)

        Returns:
            List of recommendations with scores
        """
        if not self.model or not self.dataset:
            logger.error("Model not trained. Call train() first.")
            return []

        # Check if user exists in our mapping
        if user_id not in self.user_id_map:
            logger.warning(f"User {user_id} not in training data. Using cold start.")
            return self._cold_start_recommendations(top_n)

        user_idx = self.user_id_map[user_id]

        # Get all item indices
        all_items = list(self.reverse_item_map.keys())

        # Exclude already interacted items
        if exclude_ids:
            all_items = [
                idx for idx in all_items
                if self.reverse_item_map[idx] not in exclude_ids
            ]

        # Predict scores
        scores = self.model.predict(
            user_ids=user_idx,
            item_ids=all_items,
            user_features=self.user_features_matrix,
            item_features=self.item_features_matrix
        )

        # Get top N
        top_indices = np.argsort(-scores)[:top_n]
        top_items = [all_items[i] for i in top_indices]
        top_scores = [scores[i] for i in top_indices]

        # Format results
        recommendations = [
            {
                "destination_id": self.reverse_item_map[item_idx],
                "score": float(score),
                "reason": "Users with similar preferences also liked this"
            }
            for item_idx, score in zip(top_items, top_scores)
        ]

        return recommendations

    def predict_batch(
        self,
        user_ids: List[str],
        top_n: int = 10
    ) -> Dict[str, List[Dict]]:
        """
        Generate recommendations for multiple users.

        Args:
            user_ids: List of user IDs
            top_n: Number of recommendations per user

        Returns:
            Dictionary mapping user_id to list of recommendations
        """
        results = {}

        for user_id in user_ids:
            results[user_id] = self.predict_for_user(user_id, top_n)

        return results

    def _cold_start_recommendations(self, top_n: int = 10) -> List[Dict]:
        """
        Provide recommendations for new users (cold start).

        Returns popular items based on overall scores.
        """
        logger.info("Using cold start recommendations")

        # Get popular destinations from database
        try:
            top_destinations = DataFetcher.get_top_destinations(limit=top_n)

            recommendations = [
                {
                    "destination_id": dest_id,
                    "score": 1.0 - (i * 0.05),  # Decreasing score
                    "reason": "Popular destination"
                }
                for i, dest_id in enumerate(top_destinations)
            ]

            return recommendations

        except Exception as e:
            logger.error(f"Error getting cold start recommendations: {e}")
            return []


# Global model instance
_model_instance = None


def get_model() -> CollaborativeFilteringModel:
    """Get or create the global model instance."""
    global _model_instance

    if _model_instance is None:
        _model_instance = CollaborativeFilteringModel()

    return _model_instance
