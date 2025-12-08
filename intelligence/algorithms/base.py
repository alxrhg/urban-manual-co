"""
Base Algorithm Interface

All algorithms implement this interface, making them:
- Swappable (can replace v1 with v2)
- Testable (consistent interface)
- Explainable (every prediction has a reason)
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional, Generic, TypeVar
from enum import Enum
import json

# Generic types for algorithm IO
TInput = TypeVar('TInput')
TOutput = TypeVar('TOutput')


class AlgorithmType(Enum):
    """Types of algorithms in the system"""
    TASTE_DNA = "taste_dna"           # Learn user preferences
    SEQUENCER = "sequencer"           # Predict next action
    FORECASTER = "forecaster"         # Predict demand/trends
    RANKER = "ranker"                 # Personalized ranking
    SIMILARITY = "similarity"         # Find similar items
    EXPLAINER = "explainer"           # Generate explanations
    ANOMALY = "anomaly"               # Detect unusual patterns


@dataclass
class ModelMetadata:
    """Metadata about a trained model"""
    algorithm_type: AlgorithmType
    version: str
    trained_at: datetime
    training_samples: int
    metrics: Dict[str, float]
    hyperparameters: Dict[str, Any]
    feature_importance: Optional[Dict[str, float]] = None

    def to_dict(self) -> Dict:
        return {
            "algorithm_type": self.algorithm_type.value,
            "version": self.version,
            "trained_at": self.trained_at.isoformat(),
            "training_samples": self.training_samples,
            "metrics": self.metrics,
            "hyperparameters": self.hyperparameters,
            "feature_importance": self.feature_importance,
        }


@dataclass
class Explanation:
    """Human-readable explanation of a prediction"""
    summary: str                      # One-line summary
    factors: List[Dict[str, Any]]     # Contributing factors
    confidence: float                 # 0-1 confidence score
    counterfactual: Optional[str] = None  # "If X were different..."

    def to_natural_language(self) -> str:
        """Convert to natural language for users"""
        lines = [self.summary]
        for factor in self.factors[:3]:  # Top 3 factors
            lines.append(f"  • {factor.get('description', '')}")
        return "\n".join(lines)


@dataclass
class PredictionResult(Generic[TOutput]):
    """Result of a prediction with explanation"""
    prediction: TOutput
    confidence: float
    explanation: Explanation
    metadata: Dict[str, Any] = field(default_factory=dict)
    latency_ms: float = 0.0


class Algorithm(ABC, Generic[TInput, TOutput]):
    """
    Base class for all algorithms.

    Design principles:
    1. Every algorithm can explain its predictions
    2. Every algorithm can be retrained
    3. Every algorithm has versioned artifacts
    4. Every algorithm tracks its own metrics
    """

    def __init__(self, version: str = "1.0.0"):
        self.version = version
        self.metadata: Optional[ModelMetadata] = None
        self._is_loaded = False

    @property
    @abstractmethod
    def algorithm_type(self) -> AlgorithmType:
        """Return the type of this algorithm"""
        pass

    @abstractmethod
    def train(
        self,
        training_data: Any,
        validation_data: Optional[Any] = None,
        **kwargs
    ) -> ModelMetadata:
        """
        Train or retrain the model.

        Args:
            training_data: Training dataset
            validation_data: Optional validation dataset
            **kwargs: Algorithm-specific hyperparameters

        Returns:
            ModelMetadata with training results
        """
        pass

    @abstractmethod
    def predict(self, input_data: TInput) -> PredictionResult[TOutput]:
        """
        Make a prediction with explanation.

        Args:
            input_data: Input for prediction

        Returns:
            PredictionResult with prediction, confidence, and explanation
        """
        pass

    @abstractmethod
    def explain(self, input_data: TInput, prediction: TOutput) -> Explanation:
        """
        Explain why a prediction was made.

        Args:
            input_data: The input that was used
            prediction: The prediction that was made

        Returns:
            Human-readable explanation
        """
        pass

    @abstractmethod
    def save(self, path: str) -> None:
        """Save model artifacts to path"""
        pass

    @abstractmethod
    def load(self, path: str) -> None:
        """Load model artifacts from path"""
        pass

    def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """Get feature importance if available"""
        if self.metadata:
            return self.metadata.feature_importance
        return None

    def get_metrics(self) -> Dict[str, float]:
        """Get model performance metrics"""
        if self.metadata:
            return self.metadata.metrics
        return {}


# Type aliases for common patterns
UserID = str
DestinationSlug = str
DestinationID = int


@dataclass
class UserContext:
    """Context about a user for predictions"""
    user_id: Optional[UserID]
    saved_destinations: List[DestinationSlug]
    visited_destinations: List[DestinationSlug]
    recent_searches: List[str]
    current_city: Optional[str] = None
    travel_companion: Optional[str] = None  # solo, couple, family, friends
    time_of_day: Optional[str] = None
    day_of_week: Optional[int] = None


@dataclass
class DestinationContext:
    """Context about a destination for predictions"""
    slug: DestinationSlug
    destination_id: DestinationID
    name: str
    city: str
    category: str
    rating: float
    price_level: int
    embedding: Optional[List[float]] = None
    trending_score: float = 0.0
    saves_count: int = 0
    views_count: int = 0
