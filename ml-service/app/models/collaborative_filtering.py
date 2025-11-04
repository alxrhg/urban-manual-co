"""Collaborative filtering model using LightFM."""
import numpy as np
import pandas as pd
from lightfm import LightFM
from lightfm.data import Dataset
from scipy.sparse import coo_matrix
from typing import Dict, List, Tuple, Optional
import logging
from datetime import datetime, timedelta

from app.utils.database import db
from app.config import settings

logger = logging.getLogger(__name__)


class CollaborativeFilteringModel:
    """Hybrid collaborative filtering model using LightFM."""

    def __init__(self):
        self.model = None
        self.dataset = None
        self.user_id_map = {}
        self.destination_id_map = {}
        self.reverse_user_map = {}
        self.reverse_dest_map = {}
        self.user_features = None
        self.item_features = None
        self.trained_at = None

    def prepare_interaction_data(self) -> pd.DataFrame:
        """
        Fetch and prepare user-destination interaction data.
        Combines visited_places, saved_places, and user_interactions.
        """
        logger.info("Fetching interaction data from database...")

        # Fetch all interaction sources
        visited = db.fetch_visited_places()
        saved = db.fetch_saved_places()
        interactions = db.fetch_user_interactions()

        # Convert to DataFrames
        df_visited = pd.DataFrame(visited)
        df_saved = pd.DataFrame(saved)
        df_interactions = pd.DataFrame(interactions)

        # Process visited places (weight: 5.0 - strong signal)
        if not df_visited.empty:
            df_visited['weight'] = df_visited['rating'].fillna(3.0) + 2.0  # rating + bonus
            df_visited = df_visited[['user_id', 'destination_id', 'weight']]
        else:
            df_visited = pd.DataFrame(columns=['user_id', 'destination_id', 'weight'])

        # Process saved places (weight: 4.0 - save is strong intent)
        if not df_saved.empty:
            df_saved['weight'] = 4.0
            df_saved = df_saved[['user_id', 'destination_id', 'weight']]
        else:
            df_saved = pd.DataFrame(columns=['user_id', 'destination_id', 'weight'])

        # Process user interactions (weight based on type)
        if not df_interactions.empty:
            interaction_weights = {
                'view': 1.0,
                'click': 2.0,
                'save': 4.0,
                'visit': 5.0,
                'search': 1.5
            }
            df_interactions['weight'] = df_interactions['interaction_type'].map(
                interaction_weights
            ).fillna(1.0)

            # Use engagement_score if available
            if 'engagement_score' in df_interactions.columns:
                df_interactions['weight'] = df_interactions['weight'] * (
                    1 + df_interactions['engagement_score'].fillna(0) / 10
                )

            df_interactions = df_interactions[['user_id', 'destination_id', 'weight']]
        else:
            df_interactions = pd.DataFrame(columns=['user_id', 'destination_id', 'weight'])

        # Combine all interactions
        all_interactions = pd.concat([df_visited, df_saved, df_interactions], ignore_index=True)

        # Remove nulls
        all_interactions = all_interactions.dropna(subset=['user_id', 'destination_id'])

        # Aggregate by user-destination pair (sum weights)
        interaction_matrix = all_interactions.groupby(
            ['user_id', 'destination_id']
        )['weight'].sum().reset_index()

        logger.info(
            f"Prepared {len(interaction_matrix)} interactions from "
            f"{interaction_matrix['user_id'].nunique()} users and "
            f"{interaction_matrix['destination_id'].nunique()} destinations"
        )

        return interaction_matrix

    def prepare_user_features(self, interaction_df: pd.DataFrame) -> Dict:
        """Extract user features based on their interaction history."""
        logger.info("Extracting user features...")

        # Fetch destinations for feature extraction
        destinations_df = pd.DataFrame(db.fetch_destinations())

        # Merge interactions with destination metadata
        merged = interaction_df.merge(
            destinations_df[['id', 'city', 'category', 'price_level']],
            left_on='destination_id',
            right_on='id',
            how='left'
        )

        user_features_list = []

        for user_id, user_data in merged.groupby('user_id'):
            features = [f"user:{user_id}"]

            # City preferences (top 3 cities)
            city_counts = user_data['city'].value_counts().head(3)
            for city, count in city_counts.items():
                if pd.notna(city):
                    features.append(f"city:{city}")

            # Category preferences (top 3 categories)
            category_counts = user_data['category'].value_counts().head(3)
            for category, count in category_counts.items():
                if pd.notna(category):
                    features.append(f"category:{category}")

            # Price preference (most common price level)
            price_mode = user_data['price_level'].mode()
            if len(price_mode) > 0 and pd.notna(price_mode[0]):
                features.append(f"price:{int(price_mode[0])}")

            user_features_list.append((user_id, features))

        logger.info(f"Extracted features for {len(user_features_list)} users")
        return {user_id: features for user_id, features in user_features_list}

    def prepare_item_features(self) -> Dict:
        """Extract destination (item) features."""
        logger.info("Extracting destination features...")

        destinations = db.fetch_destinations()
        item_features_list = []

        for dest in destinations:
            dest_id = dest['id']
            features = [f"destination:{dest_id}"]

            # City
            if dest.get('city'):
                features.append(f"city:{dest['city']}")

            # Category
            if dest.get('category'):
                features.append(f"category:{dest['category']}")

            # Price level
            if dest.get('price_level'):
                features.append(f"price:{int(dest['price_level'])}")

            # Michelin stars
            if dest.get('michelin_stars') and dest['michelin_stars'] > 0:
                features.append(f"michelin:{int(dest['michelin_stars'])}")
                features.append("michelin:yes")

            # Crown status
            if dest.get('crown'):
                features.append("crown:yes")

            item_features_list.append((dest_id, features))

        logger.info(f"Extracted features for {len(item_features_list)} destinations")
        return {dest_id: features for dest_id, features in item_features_list}

    def build_dataset(
        self,
        interaction_df: pd.DataFrame,
        user_features_dict: Dict,
        item_features_dict: Dict
    ) -> Dataset:
        """Build LightFM dataset with interactions and features."""
        logger.info("Building LightFM dataset...")

        dataset = Dataset()

        # Fit users and items
        unique_users = interaction_df['user_id'].unique()
        unique_items = interaction_df['destination_id'].unique()

        # Collect all feature names
        all_user_features = set()
        for features in user_features_dict.values():
            all_user_features.update(features)

        all_item_features = set()
        for features in item_features_dict.values():
            all_item_features.update(features)

        dataset.fit(
            users=unique_users,
            items=unique_items,
            user_features=all_user_features,
            item_features=all_item_features
        )

        # Build interactions
        interactions, weights = dataset.build_interactions(
            (row['user_id'], row['destination_id'], row['weight'])
            for _, row in interaction_df.iterrows()
        )

        # Build user features
        user_features_matrix = dataset.build_user_features(
            (user_id, features)
            for user_id, features in user_features_dict.items()
        )

        # Build item features
        item_features_matrix = dataset.build_item_features(
            (item_id, features)
            for item_id, features in item_features_dict.items()
        )

        self.dataset = dataset
        self.user_id_map = dataset.mapping()[0]
        self.destination_id_map = dataset.mapping()[2]
        self.reverse_user_map = {v: k for k, v in self.user_id_map.items()}
        self.reverse_dest_map = {v: k for k, v in self.destination_id_map.items()}

        logger.info(
            f"Dataset built: {len(self.user_id_map)} users, "
            f"{len(self.destination_id_map)} destinations"
        )

        return interactions, weights, user_features_matrix, item_features_matrix

    def train(self, epochs: int = 30, num_threads: int = 4):
        """Train the collaborative filtering model."""
        logger.info("Starting model training...")

        # Prepare data
        interaction_df = self.prepare_interaction_data()

        # Check if we have enough data
        if len(interaction_df) < settings.min_interactions:
            raise ValueError(
                f"Insufficient interactions ({len(interaction_df)}). "
                f"Minimum required: {settings.min_interactions}"
            )

        # Prepare features
        user_features_dict = self.prepare_user_features(interaction_df)
        item_features_dict = self.prepare_item_features()

        # Build dataset
        interactions, weights, user_features, item_features = self.build_dataset(
            interaction_df,
            user_features_dict,
            item_features_dict
        )

        self.user_features = user_features
        self.item_features = item_features

        # Initialize and train model
        self.model = LightFM(
            no_components=50,  # Embedding dimension
            loss='warp',  # Weighted Approximate-Rank Pairwise (good for implicit feedback)
            learning_rate=0.05,
            random_state=42
        )

        logger.info(f"Training LightFM model for {epochs} epochs...")
        self.model.fit(
            interactions,
            user_features=user_features,
            item_features=item_features,
            sample_weight=weights,
            epochs=epochs,
            num_threads=num_threads,
            verbose=True
        )

        self.trained_at = datetime.utcnow()
        logger.info("Model training completed successfully")

    def predict_for_user(
        self,
        user_id: str,
        top_n: int = 50,
        exclude_interacted: bool = True
    ) -> List[Dict]:
        """Generate recommendations for a specific user."""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")

        # Check if user exists in training data
        if user_id not in self.user_id_map:
            logger.warning(f"User {user_id} not in training data")
            return []

        internal_user_id = self.user_id_map[user_id]

        # Get all destination IDs
        all_dest_ids = list(self.destination_id_map.keys())
        internal_dest_ids = [self.destination_id_map[d] for d in all_dest_ids]

        # Predict scores
        scores = self.model.predict(
            user_ids=internal_user_id,
            item_ids=internal_dest_ids,
            user_features=self.user_features,
            item_features=self.item_features,
            num_threads=4
        )

        # Create recommendations list
        recommendations = []
        for dest_id, score, internal_id in zip(all_dest_ids, scores, internal_dest_ids):
            recommendations.append({
                'destination_id': dest_id,
                'score': float(score),
                'internal_id': internal_id
            })

        # Sort by score
        recommendations.sort(key=lambda x: x['score'], reverse=True)

        # Exclude already interacted items if requested
        if exclude_interacted:
            # Get user's interaction history
            user_interactions = db.execute_query(
                """
                SELECT DISTINCT destination_id
                FROM (
                    SELECT destination_id FROM visited_places WHERE user_id = %s
                    UNION
                    SELECT destination_id FROM saved_places WHERE user_id = %s
                    UNION
                    SELECT destination_id FROM user_interactions WHERE user_id = %s
                ) AS all_interactions
                """,
                (user_id, user_id, user_id)
            )
            interacted_ids = {r['destination_id'] for r in user_interactions if r['destination_id']}
            recommendations = [r for r in recommendations if r['destination_id'] not in interacted_ids]

        return recommendations[:top_n]

    def predict_for_all_users(self, top_n: int = 50) -> List[Dict]:
        """Generate recommendations for all users and return as list of dicts."""
        if self.model is None:
            raise ValueError("Model not trained. Call train() first.")

        logger.info(f"Generating recommendations for {len(self.user_id_map)} users...")

        all_recommendations = []

        for user_id in self.user_id_map.keys():
            try:
                user_recs = self.predict_for_user(user_id, top_n=top_n)

                for rec in user_recs:
                    all_recommendations.append({
                        'user_id': user_id,
                        'destination_id': rec['destination_id'],
                        'score': rec['score'],
                        'reason': 'collaborative_filtering'
                    })
            except Exception as e:
                logger.error(f"Error generating recommendations for user {user_id}: {e}")
                continue

        logger.info(f"Generated {len(all_recommendations)} total recommendations")
        return all_recommendations


# Global model instance
cf_model = CollaborativeFilteringModel()
