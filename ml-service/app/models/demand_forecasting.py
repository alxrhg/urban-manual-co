"""Demand forecasting model using Prophet."""
import pandas as pd
import numpy as np
from prophet import Prophet
from typing import Dict, List, Optional, Tuple
import logging
from datetime import datetime, timedelta
import warnings

from app.utils.database import db
from app.config import settings

warnings.filterwarnings('ignore')
logger = logging.getLogger(__name__)


class DemandForecastingModel:
    """Time-series forecasting model for destination demand using Prophet."""

    def __init__(self):
        self.models: Dict[int, Prophet] = {}
        self.forecasts: Dict[int, pd.DataFrame] = {}
        self.trained_at = None

    def prepare_timeseries_data(
        self,
        destination_id: int,
        days_back: int = 180
    ) -> Optional[pd.DataFrame]:
        """
        Prepare time-series data for a specific destination.
        Returns DataFrame with 'ds' (date) and 'y' (view count) columns for Prophet.
        """
        # Fetch view counts for this destination
        data = db.fetch_destination_views_timeseries(
            destination_ids=[destination_id],
            days_back=days_back
        )

        if not data or len(data) < 30:  # Need at least 30 days of data
            logger.warning(
                f"Insufficient data for destination {destination_id}: "
                f"{len(data) if data else 0} days"
            )
            return None

        df = pd.DataFrame(data)

        # Prophet requires 'ds' (datestamp) and 'y' (value) columns
        df = df.rename(columns={'date': 'ds', 'view_count': 'y'})
        df['ds'] = pd.to_datetime(df['ds'])

        # Fill missing dates with 0 views
        date_range = pd.date_range(start=df['ds'].min(), end=df['ds'].max(), freq='D')
        df = df.set_index('ds').reindex(date_range, fill_value=0).reset_index()
        df = df.rename(columns={'index': 'ds'})

        # Ensure y is numeric
        df['y'] = pd.to_numeric(df['y'], errors='coerce').fillna(0)

        return df

    def train_single_destination(
        self,
        destination_id: int,
        days_back: int = 180
    ) -> Optional[Prophet]:
        """Train a Prophet model for a single destination."""
        logger.info(f"Training model for destination {destination_id}...")

        # Prepare data
        df = self.prepare_timeseries_data(destination_id, days_back=days_back)

        if df is None:
            return None

        try:
            # Initialize Prophet model
            model = Prophet(
                daily_seasonality=True,
                weekly_seasonality=True,
                yearly_seasonality=False,  # Not enough data for yearly patterns
                changepoint_prior_scale=0.05,  # Flexibility in trend changes
                seasonality_prior_scale=10.0,  # Strength of seasonality
                interval_width=0.95  # Confidence intervals
            )

            # Fit model
            model.fit(df)

            logger.info(f"Model trained successfully for destination {destination_id}")
            return model

        except Exception as e:
            logger.error(f"Error training model for destination {destination_id}: {e}")
            return None

    def forecast_single_destination(
        self,
        destination_id: int,
        model: Prophet,
        forecast_days: int = 30
    ) -> Optional[pd.DataFrame]:
        """Generate forecast for a single destination."""
        try:
            # Create future dataframe
            future = model.make_future_dataframe(periods=forecast_days)

            # Generate forecast
            forecast = model.predict(future)

            # Add destination_id
            forecast['destination_id'] = destination_id

            # Filter to only future dates
            forecast = forecast[forecast['ds'] > datetime.now()]

            logger.info(
                f"Forecast generated for destination {destination_id}: "
                f"{len(forecast)} days"
            )
            return forecast

        except Exception as e:
            logger.error(f"Error forecasting for destination {destination_id}: {e}")
            return None

    def train_top_destinations(
        self,
        top_n: int = None,
        days_back: int = 180
    ) -> Dict[int, Prophet]:
        """Train models for top N destinations by views."""
        if top_n is None:
            top_n = settings.top_destinations_for_forecast

        logger.info(f"Training models for top {top_n} destinations...")

        # Get top destinations
        top_dest_ids = db.get_top_destinations_by_views(limit=top_n)

        logger.info(f"Found {len(top_dest_ids)} destinations to train")

        trained_models = {}

        for i, dest_id in enumerate(top_dest_ids, 1):
            logger.info(f"Training {i}/{len(top_dest_ids)}: Destination {dest_id}")

            model = self.train_single_destination(dest_id, days_back=days_back)

            if model is not None:
                trained_models[dest_id] = model

        self.models = trained_models
        self.trained_at = datetime.utcnow()

        logger.info(
            f"Training complete. Successfully trained {len(trained_models)} models "
            f"out of {len(top_dest_ids)} destinations"
        )

        return trained_models

    def forecast_all(self, forecast_days: int = None) -> List[Dict]:
        """Generate forecasts for all trained models."""
        if forecast_days is None:
            forecast_days = settings.forecast_days

        if not self.models:
            raise ValueError("No trained models. Call train_top_destinations() first.")

        logger.info(
            f"Generating {forecast_days}-day forecasts for "
            f"{len(self.models)} destinations..."
        )

        all_forecasts = []

        for dest_id, model in self.models.items():
            forecast = self.forecast_single_destination(dest_id, model, forecast_days)

            if forecast is not None:
                self.forecasts[dest_id] = forecast

                # Calculate aggregate metrics
                mean_forecast = forecast['yhat'].mean()
                trend = forecast['trend'].iloc[-1] - forecast['trend'].iloc[0]
                peak_day = forecast.loc[forecast['yhat'].idxmax()]['ds']

                # Determine if trending
                is_trending = trend > 0 and mean_forecast > forecast['yhat'].iloc[0] * 1.2

                all_forecasts.append({
                    'destination_id': dest_id,
                    'forecast_window': f'{forecast_days}d',
                    'predicted_trend': 'increasing' if trend > 0 else 'decreasing',
                    'metadata': {
                        'mean_forecast': float(mean_forecast),
                        'trend_value': float(trend),
                        'peak_date': peak_day.strftime('%Y-%m-%d'),
                        'is_trending': bool(is_trending),
                        'forecast_days': forecast_days
                    }
                })

        logger.info(f"Generated forecasts for {len(all_forecasts)} destinations")
        return all_forecasts

    def get_trending_destinations(
        self,
        min_trend_threshold: float = 0.15
    ) -> List[Dict]:
        """Identify trending destinations based on forecasts."""
        if not self.forecasts:
            logger.warning("No forecasts available. Run forecast_all() first.")
            return []

        trending = []

        for dest_id, forecast in self.forecasts.items():
            # Calculate trend strength
            trend = forecast['trend'].iloc[-1] - forecast['trend'].iloc[0]
            trend_pct = trend / (forecast['trend'].iloc[0] + 1)  # Avoid division by zero

            if trend_pct > min_trend_threshold:
                trending.append({
                    'destination_id': dest_id,
                    'trend_percentage': float(trend_pct * 100),
                    'predicted_views': float(forecast['yhat'].mean()),
                    'peak_date': forecast.loc[forecast['yhat'].idxmax()]['ds'].strftime('%Y-%m-%d')
                })

        # Sort by trend percentage
        trending.sort(key=lambda x: x['trend_percentage'], reverse=True)

        logger.info(f"Identified {len(trending)} trending destinations")
        return trending

    def get_best_visit_times(
        self,
        destination_id: int,
        top_n: int = 5
    ) -> List[Dict]:
        """Get best times to visit based on predicted demand (lower = better)."""
        if destination_id not in self.forecasts:
            logger.warning(f"No forecast available for destination {destination_id}")
            return []

        forecast = self.forecasts[destination_id]

        # Lower demand = better time to visit (less crowded)
        best_times = forecast.nsmallest(top_n, 'yhat')[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]

        results = []
        for _, row in best_times.iterrows():
            results.append({
                'date': row['ds'].strftime('%Y-%m-%d'),
                'day_of_week': row['ds'].strftime('%A'),
                'predicted_demand': float(row['yhat']),
                'confidence_lower': float(row['yhat_lower']),
                'confidence_upper': float(row['yhat_upper'])
            })

        return results


# Global forecasting model instance
forecast_model = DemandForecastingModel()
