"""Data fetching utilities from Supabase."""

import pandas as pd
from typing import Dict, List, Tuple
from datetime import datetime, timedelta

from app.utils.database import get_db_connection
from app.utils.logger import get_logger

logger = get_logger(__name__)


class DataFetcher:
    """Fetch and prepare data from Supabase for ML models."""

    @staticmethod
    def fetch_user_interactions() -> pd.DataFrame:
        """
        Fetch user-destination interactions from Supabase.

        Combines data from:
        - visited_places (weight: 3.0)
        - saved_places (weight: 2.0)
        - user_interactions where type='view' (weight: 1.0)

        Returns:
            DataFrame with columns: user_id, destination_id, interaction_weight, timestamp
        """
        logger.info("Fetching user interactions from Supabase")

        query = """
        WITH visited AS (
            SELECT
                vp.user_id,
                d.id as destination_id,
                3.0 as weight,
                vp.visited_at as timestamp,
                'visit' as interaction_type
            FROM visited_places vp
            JOIN destinations d ON d.slug = vp.destination_slug
            WHERE vp.visited_at >= NOW() - INTERVAL '6 months'
        ),
        saved AS (
            SELECT
                sp.user_id,
                d.id as destination_id,
                2.0 as weight,
                sp.saved_at as timestamp,
                'save' as interaction_type
            FROM saved_places sp
            JOIN destinations d ON d.slug = sp.destination_slug
            WHERE sp.saved_at >= NOW() - INTERVAL '6 months'
        ),
        views AS (
            SELECT
                ui.user_id,
                ui.destination_id,
                1.0 as weight,
                ui.created_at as timestamp,
                'view' as interaction_type
            FROM user_interactions ui
            WHERE ui.interaction_type = 'view'
            AND ui.created_at >= NOW() - INTERVAL '3 months'
        )
        SELECT
            user_id,
            destination_id,
            weight,
            timestamp,
            interaction_type
        FROM visited
        UNION ALL
        SELECT * FROM saved
        UNION ALL
        SELECT * FROM views
        ORDER BY timestamp DESC
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn)

            logger.info(f"Fetched {len(df)} interactions for {df['user_id'].nunique()} users")
            return df

        except Exception as e:
            logger.error(f"Error fetching user interactions: {e}")
            raise

    @staticmethod
    def fetch_user_features() -> pd.DataFrame:
        """
        Fetch user profile features.

        Returns:
            DataFrame with columns: user_id, favorite_cities, favorite_categories,
                                   price_preference, travel_style
        """
        logger.info("Fetching user features from Supabase")

        query = """
        SELECT
            user_id,
            favorite_cities,
            favorite_categories,
            price_preference,
            travel_style,
            interests
        FROM user_profiles
        WHERE user_id IS NOT NULL
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn)

            logger.info(f"Fetched features for {len(df)} users")
            return df

        except Exception as e:
            logger.error(f"Error fetching user features: {e}")
            raise

    @staticmethod
    def fetch_destination_features() -> pd.DataFrame:
        """
        Fetch destination features for item-based filtering.

        Returns:
            DataFrame with columns: id, city, category, michelin_stars,
                                   price_level, rating, tags
        """
        logger.info("Fetching destination features from Supabase")

        query = """
        SELECT
            id,
            slug,
            name,
            city,
            category,
            COALESCE(michelin_stars, 0) as michelin_stars,
            COALESCE(price_level, 2) as price_level,
            COALESCE(rating, 0) as rating,
            tags,
            crown
        FROM destinations
        WHERE id IS NOT NULL
        ORDER BY id
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query, conn)

            logger.info(f"Fetched features for {len(df)} destinations")
            return df

        except Exception as e:
            logger.error(f"Error fetching destination features: {e}")
            raise

    @staticmethod
    def fetch_analytics_data(days: int = 180) -> pd.DataFrame:
        """
        Fetch analytics data for demand forecasting.

        Args:
            days: Number of days of historical data to fetch

        Returns:
            DataFrame with columns: destination_id, date, view_count, save_count, visit_count
        """
        logger.info(f"Fetching analytics data for last {days} days")

        query = """
        WITH daily_views AS (
            SELECT
                destination_id,
                DATE(created_at) as date,
                COUNT(*) as view_count
            FROM user_interactions
            WHERE interaction_type = 'view'
            AND created_at >= NOW() - INTERVAL '%s days'
            GROUP BY destination_id, DATE(created_at)
        ),
        daily_saves AS (
            SELECT
                d.id as destination_id,
                DATE(sp.saved_at) as date,
                COUNT(*) as save_count
            FROM saved_places sp
            JOIN destinations d ON d.slug = sp.destination_slug
            WHERE sp.saved_at >= NOW() - INTERVAL '%s days'
            GROUP BY d.id, DATE(sp.saved_at)
        ),
        daily_visits AS (
            SELECT
                d.id as destination_id,
                DATE(vp.visited_at) as date,
                COUNT(*) as visit_count
            FROM visited_places vp
            JOIN destinations d ON d.slug = vp.destination_slug
            WHERE vp.visited_at >= NOW() - INTERVAL '%s days'
            GROUP BY d.id, DATE(vp.visited_at)
        )
        SELECT
            COALESCE(v.destination_id, s.destination_id, vs.destination_id) as destination_id,
            COALESCE(v.date, s.date, vs.date) as date,
            COALESCE(v.view_count, 0) as view_count,
            COALESCE(s.save_count, 0) as save_count,
            COALESCE(vs.visit_count, 0) as visit_count
        FROM daily_views v
        FULL OUTER JOIN daily_saves s ON v.destination_id = s.destination_id AND v.date = s.date
        FULL OUTER JOIN daily_visits vs ON COALESCE(v.destination_id, s.destination_id) = vs.destination_id
            AND COALESCE(v.date, s.date) = vs.date
        ORDER BY date DESC, destination_id
        """

        try:
            with get_db_connection() as conn:
                df = pd.read_sql_query(query % (days, days, days), conn)

            logger.info(f"Fetched {len(df)} analytics records")
            return df

        except Exception as e:
            logger.error(f"Error fetching analytics data: {e}")
            raise

    @staticmethod
    def get_top_destinations(limit: int = 200) -> List[int]:
        """
        Get top N destinations by total interactions.

        Args:
            limit: Number of top destinations to return

        Returns:
            List of destination IDs
        """
        query = """
        WITH interaction_counts AS (
            SELECT
                destination_id,
                COUNT(*) as total_interactions
            FROM user_interactions
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY destination_id
        )
        SELECT destination_id
        FROM interaction_counts
        ORDER BY total_interactions DESC
        LIMIT %s
        """

        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, (limit,))
                    results = cur.fetchall()
                    destination_ids = [row[0] for row in results]

            logger.info(f"Fetched top {len(destination_ids)} destinations")
            return destination_ids

        except Exception as e:
            logger.error(f"Error fetching top destinations: {e}")
            raise
