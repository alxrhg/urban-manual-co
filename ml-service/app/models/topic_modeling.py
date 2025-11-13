"""Topic modeling using BERTopic."""

from typing import List, Dict, Optional
from datetime import datetime
import pandas as pd
from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
import numpy as np

from app.config import get_settings
from app.utils.logger import get_logger
from app.utils.data_fetcher import DataFetcher

logger = get_logger(__name__)
settings = get_settings()


class TopicModelingModel:
    """
    Topic modeling for discovering themes in user notes, reviews, and descriptions.
    
    Uses BERTopic for modern, high-quality topic extraction.
    """

    def __init__(self):
        """Initialize the topic model."""
        self.model = None
        self.embedding_model = None
        self.trained_at = None

    def _load_embedding_model(self):
        """Load sentence transformer for embeddings."""
        try:
            logger.info(
                "Loading embedding model for topic modeling using %s...",
                settings.topic_model_embedding_model,
            )
            self.embedding_model = SentenceTransformer(settings.topic_model_embedding_model)
            logger.info("Embedding model loaded")
        except Exception as e:
            logger.error(f"Error loading embedding model: {e}")
            self.embedding_model = None

    def train(
        self,
        texts: List[str],
        min_topic_size: int = 5,
        n_topics: Optional[int] = None
    ) -> Dict:
        """
        Train topic model on a collection of texts.
        
        Args:
            texts: List of text documents
            min_topic_size: Minimum documents per topic
            n_topics: Optional fixed number of topics
        
        Returns:
            Training results with topics and statistics
        """
        if not texts or len(texts) < min_topic_size:
            logger.warning(f"Not enough texts for topic modeling: {len(texts)}")
            return {
                'status': 'insufficient_data',
                'topics': [],
                'num_topics': 0,
            }

        try:
            if not self.embedding_model:
                self._load_embedding_model()

            if not self.embedding_model:
                logger.error("Embedding model not available")
                return {
                    'status': 'error',
                    'error': 'Embedding model not loaded',
                }

            logger.info(f"Training topic model on {len(texts)} documents...")

            # Initialize BERTopic
            self.model = BERTopic(
                embedding_model=self.embedding_model,
                min_topic_size=min_topic_size,
                nr_topics=n_topics,
                verbose=True
            )

            # Train model
            topics, probs = self.model.fit_transform(texts)

            # Get topic information
            topic_info = self.model.get_topic_info()
            
            # Extract topic keywords
            topics_dict = {}
            for topic_id in set(topics):
                if topic_id != -1:  # Exclude outliers
                    topic_words = self.model.get_topic(topic_id)
                    topics_dict[topic_id] = {
                        'topic_id': int(topic_id),
                        'keywords': [word for word, _ in topic_words[:10]],
                        'keywords_with_scores': topic_words[:10],
                        'count': int(sum(1 for t in topics if t == topic_id)),
                    }

            self.trained_at = datetime.utcnow()

            logger.info(f"Topic model trained: {len(topics_dict)} topics discovered")

            return {
                'status': 'success',
                'topics': list(topics_dict.values()),
                'num_topics': len(topics_dict),
                'total_documents': len(texts),
                'trained_at': self.trained_at.isoformat(),
            }

        except Exception as e:
            logger.error(f"Error training topic model: {e}")
            return {
                'status': 'error',
                'error': str(e),
            }

    def extract_topics_for_city(
        self,
        city: str,
        min_topic_size: int = 5
    ) -> Dict:
        """
        Extract topics for a specific city from destination descriptions and notes.
        
        Args:
            city: City name
            min_topic_size: Minimum documents per topic
        
        Returns:
            Topics discovered for the city
        """
        try:
            # Fetch texts for destinations in this city
            texts = self._fetch_city_texts(city)
            
            if not texts or len(texts) < min_topic_size:
                return {
                    'city': city,
                    'topics': [],
                    'num_topics': 0,
                    'status': 'insufficient_data',
                }

            # Train model on city-specific texts
            result = self.train(texts, min_topic_size=min_topic_size)
            
            return {
                'city': city,
                **result,
            }

        except Exception as e:
            logger.error(f"Error extracting topics for city {city}: {e}")
            return {
                'city': city,
                'status': 'error',
                'error': str(e),
            }

    def extract_topics_for_destination(
        self,
        destination_id: int,
        min_topic_size: int = 3
    ) -> Dict:
        """
        Extract topics from user notes and reviews for a destination.
        
        Args:
            destination_id: Destination ID
            min_topic_size: Minimum documents per topic
        
        Returns:
            Topics discovered for the destination
        """
        try:
            texts = self._fetch_destination_texts(destination_id)
            
            if not texts or len(texts) < min_topic_size:
                return {
                    'destination_id': destination_id,
                    'topics': [],
                    'num_topics': 0,
                    'status': 'insufficient_data',
                }

            result = self.train(texts, min_topic_size=min_topic_size)
            
            return {
                'destination_id': destination_id,
                **result,
            }

        except Exception as e:
            logger.error(f"Error extracting topics for destination {destination_id}: {e}")
            return {
                'destination_id': destination_id,
                'status': 'error',
                'error': str(e),
            }

    def _fetch_city_texts(self, city: str) -> List[str]:
        """Fetch text data for destinations in a city."""
        try:
            # Placeholder: Query destinations in city
            # Combine descriptions, notes, tags
            # This would use DataFetcher
            return []
        except Exception as e:
            logger.error(f"Error fetching city texts: {e}")
            return []

    def _fetch_destination_texts(self, destination_id: int) -> List[str]:
        """Fetch text data for a destination."""
        try:
            # Placeholder: Query user notes, reviews for destination
            return []
        except Exception as e:
            logger.error(f"Error fetching destination texts: {e}")
            return []


# Global model instance
_topic_model_instance = None


def get_topic_model() -> TopicModelingModel:
    """Get or create the global topic model instance."""
    global _topic_model_instance
    if _topic_model_instance is None:
        _topic_model_instance = TopicModelingModel()
    return _topic_model_instance

