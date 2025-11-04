"""Demand forecasting using Prophet."""

import pandas as pd
import numpy as np
from prophet import Prophet
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class DemandForecastModel:
    """
    Prophet-based demand forecasting for destinations.

    Forecasts daily demand (views, saves, visits) for destinations.
    """

    def __init__(self):
        """Initialize the demand forecast model."""
        self.models = {}  # destination_id -> Prophet model
        self.forecasts = {}  # destination_id -> forecast DataFrame
        self.trained_at = None

    def prepare_time_series(
        self,
        destination_id: int,
        analytics_df: pd.DataFrame
    ) -> Optional[pd.DataFrame]:
        """
        Prepare time series data for a specific destination.

        Args:
            destination_id: Destination ID to prepare data for
            analytics_df: DataFrame with analytics data

        Returns:
            DataFrame with columns [ds, y] for Prophet, or None if insufficient data
        """
        # Filter for this destination
        dest_data = analytics_df[analytics_df['destination_id'] == destination_id].copy()

        if len(dest_data) < 14:  # Need at least 2 weeks of data
            return None

        # Combine metrics into a single demand score
        # Weight: views=1, saves=3, visits=5
        dest_data['demand'] = (
            dest_data['view_count'] * 1.0 +
            dest_data['save_count'] * 3.0 +
            dest_data['visit_count'] * 5.0
        )

        # Prepare for Prophet (requires 'ds' and 'y' columns)
        ts_data = dest_data[['date', 'demand']].copy()
        ts_data.columns = ['ds', 'y']
        ts_data = ts_data.sort_values('ds')

        # Fill missing dates with zero demand
        date_range = pd.date_range(
            start=ts_data['ds'].min(),
            end=ts_data['ds'].max(),
            freq='D'
        )
        ts_data = ts_data.set_index('ds').reindex(date_range, fill_value=0).reset_index()
        ts_data.columns = ['ds', 'y']

        return ts_data

    def train_for_destination(
        self,
        destination_id: int,
        ts_data: pd.DataFrame
    ) -> bool:
        """
        Train Prophet model for a specific destination.

        Args:
            destination_id: Destination ID
            ts_data: Time series data with columns [ds, y]

        Returns:
            True if training succeeded, False otherwise
        """
        try:
            # Initialize Prophet model
            model = Prophet(
                seasonality_mode=settings.prophet_seasonality_mode,
                daily_seasonality=False,
                weekly_seasonality=True,
                yearly_seasonality=True,
                changepoint_prior_scale=0.05,  # Conservative to avoid overfitting
            )

            # Add custom seasonalities
            model.add_seasonality(
                name='monthly',
                period=30.5,
                fourier_order=5
            )

            # Fit model
            with np.errstate(divide='ignore', invalid='ignore'):
                model.fit(ts_data)

            self.models[destination_id] = model
            return True

        except Exception as e:
            logger.error(f"Error training model for destination {destination_id}: {e}")
            return False

    def forecast_destination(
        self,
        destination_id: int,
        periods: int = 30
    ) -> Optional[pd.DataFrame]:
        """
        Generate forecast for a destination.

        Args:
            destination_id: Destination ID
            periods: Number of days to forecast

        Returns:
            Forecast DataFrame or None if model not trained
        """
        if destination_id not in self.models:
            logger.warning(f"No model for destination {destination_id}")
            return None

        try:
            model = self.models[destination_id]

            # Create future dataframe
            future = model.make_future_dataframe(periods=periods)

            # Generate forecast
            forecast = model.predict(future)

            # Store forecast
            self.forecasts[destination_id] = forecast

            return forecast

        except Exception as e:
            logger.error(f"Error forecasting for destination {destination_id}: {e}")
            return None

    def train_top_destinations(
        self,
        top_n: int = 200,
        historical_days: int = 180
    ) -> Dict[str, int]:
        """
        Train models for top N destinations.

        Args:
            top_n: Number of top destinations to train
            historical_days: Days of historical data to use

        Returns:
            Training statistics
        """
        logger.info(f"Training forecast models for top {top_n} destinations")

        # Get top destinations
        top_destinations = DataFetcher.get_top_destinations(limit=top_n)

        # Fetch analytics data
        analytics_df = DataFetcher.fetch_analytics_data(days=historical_days)

        if analytics_df.empty:
            logger.warning("No analytics data available")
            return {"trained": 0, "skipped": top_n, "failed": 0}

        # Train models
        trained = 0
        skipped = 0
        failed = 0

        for dest_id in top_destinations:
            # Prepare time series
            ts_data = self.prepare_time_series(dest_id, analytics_df)

            if ts_data is None:
                skipped += 1
                continue

            # Train model
            success = self.train_for_destination(dest_id, ts_data)

            if success:
                trained += 1
            else:
                failed += 1

        self.trained_at = datetime.utcnow()

        logger.info(f"Training complete. Trained: {trained}, Skipped: {skipped}, Failed: {failed}")

        return {
            "trained": trained,
            "skipped": skipped,
            "failed": failed,
            "total": top_n
        }

    def get_trending_destinations(
        self,
        top_n: int = 20,
        forecast_days: int = 7
    ) -> List[Dict]:
        """
        Get trending destinations based on forecast growth.

        Args:
            top_n: Number of trending destinations to return
            forecast_days: Days ahead to consider for trend

        Returns:
            List of trending destinations with growth metrics
        """
        trending = []

        for dest_id in self.models.keys():
            # Get forecast
            forecast = self.forecast_destination(dest_id, periods=forecast_days)

            if forecast is None:
                continue

            # Calculate trend (growth in next week vs recent average)
            recent_avg = forecast.tail(14)['yhat'].mean()
            future_avg = forecast.tail(forecast_days)['yhat'].mean()

            if recent_avg > 0:
                growth_rate = (future_avg - recent_avg) / recent_avg
            else:
                growth_rate = 0

            trending.append({
                "destination_id": dest_id,
                "growth_rate": float(growth_rate),
                "current_demand": float(recent_avg),
                "forecast_demand": float(future_avg)
            })

        # Sort by growth rate
        trending.sort(key=lambda x: x['growth_rate'], reverse=True)

        return trending[:top_n]

    def get_peak_times(
        self,
        destination_id: int,
        forecast_days: int = 30
    ) -> Optional[Dict]:
        """
        Identify peak demand times for a destination.

        Args:
            destination_id: Destination ID
            forecast_days: Days to analyze

        Returns:
            Dictionary with peak time information
        """
        if destination_id not in self.forecasts:
            # Generate forecast if not available
            self.forecast_destination(destination_id, periods=forecast_days)

        if destination_id not in self.forecasts:
            return None

        forecast = self.forecasts[destination_id]
        future_forecast = forecast.tail(forecast_days)

        # Find peak day
        peak_idx = future_forecast['yhat'].idxmax()
        peak_row = future_forecast.loc[peak_idx]

        # Find low demand day
        low_idx = future_forecast['yhat'].idxmin()
        low_row = future_forecast.loc[low_idx]

        return {
            "destination_id": destination_id,
            "peak_date": peak_row['ds'].isoformat(),
            "peak_demand": float(peak_row['yhat']),
            "low_date": low_row['ds'].isoformat(),
            "low_demand": float(low_row['yhat']),
            "average_demand": float(future_forecast['yhat'].mean()),
            "forecast_period_days": forecast_days
        }


# Global model instance
_forecast_model = None


def get_forecast_model() -> DemandForecastModel:
    """Get or create the global forecast model instance."""
    global _forecast_model

    if _forecast_model is None:
        _forecast_model = DemandForecastModel()

    return _forecast_model
