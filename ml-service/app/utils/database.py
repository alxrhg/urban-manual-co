"""Database connection and query utilities."""
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any, Optional
import logging
from contextlib import contextmanager
from app.config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database connections and queries."""

    def __init__(self):
        self.connection_string = settings.postgres_url

    @contextmanager
    def get_connection(self):
        """Get a database connection context manager."""
        conn = None
        try:
            conn = psycopg2.connect(self.connection_string)
            yield conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return results as list of dicts."""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()
                return [dict(row) for row in results]

    def execute_update(self, query: str, params: tuple = None) -> int:
        """Execute an INSERT/UPDATE/DELETE query and return affected rows."""
        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount

    def fetch_user_interactions(self) -> List[Dict[str, Any]]:
        """Fetch all user-destination interactions."""
        query = """
            SELECT
                user_id,
                destination_id,
                interaction_type,
                engagement_score,
                created_at
            FROM user_interactions
            ORDER BY created_at DESC
        """
        return self.execute_query(query)

    def fetch_saved_places(self) -> List[Dict[str, Any]]:
        """Fetch all saved places (bookmarks)."""
        query = """
            SELECT
                user_id,
                destination_id,
                destination_slug,
                saved_at,
                tags
            FROM saved_places
            WHERE destination_id IS NOT NULL
            ORDER BY saved_at DESC
        """
        return self.execute_query(query)

    def fetch_visited_places(self) -> List[Dict[str, Any]]:
        """Fetch all visited places."""
        query = """
            SELECT
                user_id,
                destination_id,
                destination_slug,
                visited_at,
                rating,
                notes
            FROM visited_places
            WHERE destination_id IS NOT NULL
            ORDER BY visited_at DESC
        """
        return self.execute_query(query)

    def fetch_destinations(self) -> List[Dict[str, Any]]:
        """Fetch all destinations with metadata."""
        query = """
            SELECT
                id,
                slug,
                name,
                city,
                category,
                price_level,
                michelin_stars,
                rating,
                crown,
                rank_score,
                trending_score,
                views_count,
                saves_count
            FROM destinations
            ORDER BY rank_score DESC NULLS LAST
        """
        return self.execute_query(query)

    def fetch_destination_views_timeseries(
        self,
        destination_ids: Optional[List[int]] = None,
        days_back: int = 180
    ) -> List[Dict[str, Any]]:
        """Fetch historical view counts for demand forecasting."""
        if destination_ids:
            query = """
                SELECT
                    destination_id,
                    DATE(created_at) as date,
                    COUNT(*) as view_count
                FROM user_interactions
                WHERE interaction_type = 'view'
                    AND created_at >= NOW() - INTERVAL '%s days'
                    AND destination_id = ANY(%s)
                GROUP BY destination_id, DATE(created_at)
                ORDER BY destination_id, date
            """
            return self.execute_query(query, (days_back, destination_ids))
        else:
            query = """
                SELECT
                    destination_id,
                    DATE(created_at) as date,
                    COUNT(*) as view_count
                FROM user_interactions
                WHERE interaction_type = 'view'
                    AND created_at >= NOW() - INTERVAL '%s days'
                GROUP BY destination_id, DATE(created_at)
                ORDER BY destination_id, date
            """
            return self.execute_query(query, (days_back,))

    def get_top_destinations_by_views(self, limit: int = 200) -> List[int]:
        """Get top N destinations by total views."""
        query = """
            SELECT destination_id, COUNT(*) as total_views
            FROM user_interactions
            WHERE interaction_type = 'view'
                AND destination_id IS NOT NULL
            GROUP BY destination_id
            ORDER BY total_views DESC
            LIMIT %s
        """
        results = self.execute_query(query, (limit,))
        return [r['destination_id'] for r in results]

    def store_recommendation_scores(
        self,
        scores: List[Dict[str, Any]]
    ) -> int:
        """Store recommendation scores in personalization_scores table."""
        if not scores:
            return 0

        # Bulk insert using executemany
        query = """
            INSERT INTO personalization_scores
                (user_id, destination_id, score, reason, generated_at, expires_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW() + INTERVAL '168 hours')
            ON CONFLICT (user_id, destination_id)
            DO UPDATE SET
                score = EXCLUDED.score,
                reason = EXCLUDED.reason,
                generated_at = EXCLUDED.generated_at,
                expires_at = EXCLUDED.expires_at
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                values = [
                    (
                        score['user_id'],
                        score['destination_id'],
                        score['score'],
                        score.get('reason', 'collaborative_filtering')
                    )
                    for score in scores
                ]
                cursor.executemany(query, values)
                conn.commit()
                return cursor.rowcount

    def store_forecast_data(
        self,
        forecasts: List[Dict[str, Any]]
    ) -> int:
        """Store demand forecasts in forecasting_data table."""
        if not forecasts:
            return 0

        query = """
            INSERT INTO forecasting_data
                (destination_id, forecast_window, predicted_trend, metadata, generated_at)
            VALUES (%s, %s, %s, %s::jsonb, NOW())
            ON CONFLICT (destination_id, forecast_window)
            DO UPDATE SET
                predicted_trend = EXCLUDED.predicted_trend,
                metadata = EXCLUDED.metadata,
                generated_at = EXCLUDED.generated_at
        """

        with self.get_connection() as conn:
            with conn.cursor() as cursor:
                import json
                values = [
                    (
                        forecast['destination_id'],
                        forecast['forecast_window'],
                        forecast['predicted_trend'],
                        json.dumps(forecast.get('metadata', {}))
                    )
                    for forecast in forecasts
                ]
                cursor.executemany(query, values)
                conn.commit()
                return cursor.rowcount


# Global database manager instance
db = DatabaseManager()
