"""Anomaly detection for traffic spikes, sentiment changes, and unusual patterns."""

from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class AnomalyDetectionModel:
    """
    Detect anomalies in destination traffic, sentiment, and engagement metrics.
    
    Uses Isolation Forest for unsupervised anomaly detection.
    """

    def __init__(self):
        """Initialize the anomaly detection model."""
        self.model = None
        self.scaler = StandardScaler()
        self.trained_at = None

    def detect_traffic_anomalies(
        self,
        destination_id: int,
        days: int = 30,
        contamination: float = 0.1
    ) -> Dict:
        """
        Detect traffic anomalies for a destination.
        
        Args:
            destination_id: Destination ID
            days: Number of days to analyze
            contamination: Expected proportion of anomalies (0.0 to 0.5)
        
        Returns:
            Anomaly detection results
        """
        try:
            # Fetch traffic metrics
            metrics = self._fetch_traffic_metrics(destination_id, days)
            
            if len(metrics) < 7:  # Need at least a week of data
                return {
                    'destination_id': destination_id,
                    'anomalies': [],
                    'anomaly_count': 0,
                    'status': 'insufficient_data',
                }

            # Prepare features
            df = pd.DataFrame(metrics)
            features = ['views', 'saves', 'clicks', 'visits']
            available_features = [f for f in features if f in df.columns]
            
            if not available_features:
                return {
                    'destination_id': destination_id,
                    'anomalies': [],
                    'anomaly_count': 0,
                    'status': 'no_features',
                }

            # Scale features
            X = df[available_features].values
            X_scaled = self.scaler.fit_transform(X)

            # Train Isolation Forest
            self.model = IsolationForest(
                contamination=contamination,
                random_state=42,
                n_estimators=100
            )
            self.model.fit(X_scaled)

            # Predict anomalies
            predictions = self.model.predict(X_scaled)
            anomaly_scores = self.model.score_samples(X_scaled)

            # Identify anomalies
            anomalies = []
            for i, (pred, score) in enumerate(zip(predictions, anomaly_scores)):
                if pred == -1:  # Anomaly
                    anomalies.append({
                        'date': df.iloc[i]['date'].isoformat() if 'date' in df.columns else None,
                        'metrics': {f: float(df.iloc[i][f]) for f in available_features},
                        'anomaly_score': float(score),
                        'type': self._classify_anomaly_type(df.iloc[i], available_features),
                    })

            self.trained_at = datetime.utcnow()

            return {
                'destination_id': destination_id,
                'anomalies': anomalies,
                'anomaly_count': len(anomalies),
                'total_days': len(metrics),
                'detected_at': self.trained_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error detecting traffic anomalies: {e}")
            return {
                'destination_id': destination_id,
                'status': 'error',
                'error': str(e),
            }

    def detect_sentiment_anomalies(
        self,
        destination_id: int,
        days: int = 30
    ) -> Dict:
        """
        Detect sudden sentiment changes.
        
        Args:
            destination_id: Destination ID
            days: Number of days to analyze
        
        Returns:
            Sentiment anomaly results
        """
        try:
            # Fetch sentiment history
            sentiment_history = self._fetch_sentiment_history(destination_id, days)
            
            if len(sentiment_history) < 7:
                return {
                    'destination_id': destination_id,
                    'anomalies': [],
                    'status': 'insufficient_data',
                }

            df = pd.DataFrame(sentiment_history)
            
            # Calculate sentiment change rate
            if 'sentiment_score' in df.columns:
                df['sentiment_change'] = df['sentiment_score'].diff().abs()
                df['sentiment_volatility'] = df['sentiment_score'].rolling(window=7).std()
                
                # Identify anomalies (sudden drops or spikes)
                threshold = df['sentiment_change'].quantile(0.95)
                anomalies = df[df['sentiment_change'] > threshold].to_dict('records')
                
                return {
                    'destination_id': destination_id,
                    'anomalies': [
                        {
                            'date': a.get('date'),
                            'sentiment_score': a.get('sentiment_score'),
                            'change': float(a.get('sentiment_change', 0)),
                            'type': 'sentiment_spike' if a.get('sentiment_score', 0) > 0 else 'sentiment_drop',
                        }
                        for a in anomalies
                    ],
                    'anomaly_count': len(anomalies),
                }

            return {
                'destination_id': destination_id,
                'anomalies': [],
                'status': 'no_sentiment_data',
            }

        except Exception as e:
            logger.error(f"Error detecting sentiment anomalies: {e}")
            return {
                'destination_id': destination_id,
                'status': 'error',
                'error': str(e),
            }

    def detect_city_anomalies(
        self,
        city: str,
        days: int = 30
    ) -> Dict:
        """
        Detect anomalies across all destinations in a city.
        
        Useful for identifying city-wide events or trends.
        """
        try:
            # Fetch aggregated city metrics
            city_metrics = self._fetch_city_metrics(city, days)
            
            if len(city_metrics) < 7:
                return {
                    'city': city,
                    'anomalies': [],
                    'status': 'insufficient_data',
                }

            # Similar to destination detection but aggregated
            df = pd.DataFrame(city_metrics)
            features = ['total_views', 'total_saves', 'total_visits']
            available_features = [f for f in features if f in df.columns]
            
            if not available_features:
                return {
                    'city': city,
                    'anomalies': [],
                    'status': 'no_features',
                }

            X = df[available_features].values
            X_scaled = self.scaler.fit_transform(X)
            
            self.model = IsolationForest(contamination=0.1, random_state=42)
            self.model.fit(X_scaled)
            
            predictions = self.model.predict(X_scaled)
            anomaly_scores = self.model.score_samples(X_scaled)
            
            anomalies = []
            for i, (pred, score) in enumerate(zip(predictions, anomaly_scores)):
                if pred == -1:
                    anomalies.append({
                        'date': df.iloc[i]['date'].isoformat() if 'date' in df.columns else None,
                        'metrics': {f: float(df.iloc[i][f]) for f in available_features},
                        'anomaly_score': float(score),
                    })

            return {
                'city': city,
                'anomalies': anomalies,
                'anomaly_count': len(anomalies),
            }

        except Exception as e:
            logger.error(f"Error detecting city anomalies: {e}")
            return {
                'city': city,
                'status': 'error',
                'error': str(e),
            }

    def _classify_anomaly_type(self, row: pd.Series, features: List[str]) -> str:
        """Classify the type of anomaly based on metrics."""
        # Simple heuristic: check which metric is unusually high
        if 'views' in features and row['views'] > row.get('views', 0) * 2:
            return 'traffic_spike'
        elif 'saves' in features and row['saves'] > row.get('saves', 0) * 2:
            return 'popularity_spike'
        elif 'visits' in features and row['visits'] > row.get('visits', 0) * 2:
            return 'visit_spike'
        else:
            return 'general_anomaly'

    def _fetch_traffic_metrics(
        self,
        destination_id: int,
        days: int
    ) -> List[Dict]:
        """Fetch daily traffic metrics for a destination."""
        try:
            # Placeholder: Query daily views, saves, clicks, visits
            # This would use DataFetcher
            return []
        except Exception as e:
            logger.error(f"Error fetching traffic metrics: {e}")
            return []

    def _fetch_sentiment_history(
        self,
        destination_id: int,
        days: int
    ) -> List[Dict]:
        """Fetch sentiment history for a destination."""
        try:
            # Placeholder: Query sentiment scores over time
            return []
        except Exception as e:
            logger.error(f"Error fetching sentiment history: {e}")
            return []

    def _fetch_city_metrics(self, city: str, days: int) -> List[Dict]:
        """Fetch aggregated metrics for a city."""
        try:
            # Placeholder: Query aggregated city metrics
            return []
        except Exception as e:
            logger.error(f"Error fetching city metrics: {e}")
            return []


# Global model instance
_anomaly_model_instance = None


def get_anomaly_model() -> AnomalyDetectionModel:
    """Get or create the global anomaly detection model instance."""
    global _anomaly_model_instance
    if _anomaly_model_instance is None:
        _anomaly_model_instance = AnomalyDetectionModel()
    return _anomaly_model_instance

