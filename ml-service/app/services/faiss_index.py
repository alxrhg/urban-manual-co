"""FAISS index management for destination embeddings."""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

import numpy as np

from app.config import get_settings
from app.utils.logger import get_logger

try:
    import faiss  # type: ignore
except ImportError:  # pragma: no cover - handled in availability flag
    faiss = None


logger = get_logger(__name__)
settings = get_settings()


class FaissIndexService:
    """Manage a FAISS index for semantic destination search."""

    def __init__(
        self,
        dimension: int = 1536,
        index_path: Optional[str] = None,
        metadata_path: Optional[str] = None,
    ) -> None:
        self.available = faiss is not None
        self.dimension = dimension
        self.index_path = index_path or os.getenv("FAISS_INDEX_PATH", getattr(settings, "faiss_index_path", "data/faiss.index"))
        self.metadata_path = metadata_path or os.getenv(
            "FAISS_METADATA_PATH", getattr(settings, "faiss_metadata_path", "data/faiss-metadata.json")
        )
        self.index: Optional[Any] = None
        self.metadata: List[Dict[str, Any]] = []
        self._ensure_directories()

        if not self.available:
            logger.warning("FAISS is not installed. FAISS index service disabled.")
            return

        self._load_or_create_index()

    def _ensure_directories(self) -> None:
        """Ensure directories exist for storing the index and metadata files."""
        for path in [self.index_path, self.metadata_path]:
            directory = os.path.dirname(path)
            if directory:
                os.makedirs(directory, exist_ok=True)

    def _load_or_create_index(self) -> None:
        """Load an existing FAISS index or create a new one."""
        if os.path.exists(self.index_path):
            try:
                self.index = faiss.read_index(self.index_path)  # type: ignore[arg-type]
                self.metadata = self._load_metadata()
                logger.info(
                    "Loaded FAISS index from %s with %d vectors", self.index_path, self.index.ntotal if self.index else 0
                )
                return
            except Exception as exc:  # pragma: no cover - defensive branch
                logger.warning("Failed to load FAISS index, creating new one: %s", exc)

        self.index = faiss.IndexFlatIP(self.dimension)
        self.metadata = []
        logger.info("Initialized new FAISS index with dimension %d", self.dimension)

    def _load_metadata(self) -> List[Dict[str, Any]]:
        if not os.path.exists(self.metadata_path):
            return []
        try:
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:  # pragma: no cover - defensive branch
            logger.warning("Failed to load FAISS metadata file: %s", exc)
            return []

    def save(self) -> None:
        """Persist the FAISS index and metadata to disk."""
        if not self.available or not self.index:
            return

        faiss.write_index(self.index, self.index_path)  # type: ignore[arg-type]
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f)
        logger.info("Saved FAISS index to %s (%d vectors)", self.index_path, len(self.metadata))

    def _normalize_vectors(self, vectors: np.ndarray) -> np.ndarray:
        """Normalize vectors to unit length for cosine similarity via inner product."""
        if vectors.size == 0:
            return vectors
        norms = np.linalg.norm(vectors, axis=1, keepdims=True)
        # Avoid division by zero
        norms[norms == 0] = 1.0
        return vectors / norms

    def build_from_records(self, records: List[Dict[str, Any]]) -> int:
        """Rebuild the index from destination records containing embeddings."""
        if not self.available:
            raise RuntimeError("FAISS is not available in this environment.")

        embeddings: List[List[float]] = []
        metadata: List[Dict[str, Any]] = []

        for record in records:
            embedding = record.get("vector_embedding") or record.get("embedding")
            if embedding is None:
                continue

            if isinstance(embedding, str):
                try:
                    embedding = json.loads(embedding)
                except json.JSONDecodeError:
                    logger.warning("Skipping record %s due to invalid embedding string", record.get("id"))
                    continue

            try:
                vector = [float(x) for x in embedding]
            except (TypeError, ValueError):
                logger.warning("Skipping record %s due to non-numeric embedding", record.get("id"))
                continue

            if len(vector) != self.dimension:
                logger.warning(
                    "Skipping record %s: embedding dimension %d does not match expected %d",
                    record.get("id"),
                    len(vector),
                    self.dimension,
                )
                continue

            embeddings.append(vector)
            metadata.append(
                {
                    "id": record.get("id"),
                    "slug": record.get("slug"),
                    "name": record.get("name"),
                    "city": record.get("city"),
                    "category": record.get("category"),
                }
            )

        if not embeddings:
            raise ValueError("No valid embeddings provided to build FAISS index.")

        vectors = np.array(embeddings, dtype="float32")
        vectors = self._normalize_vectors(vectors)

        self.index = faiss.IndexFlatIP(self.dimension)
        self.index.add(vectors)
        self.metadata = metadata

        logger.info("Rebuilt FAISS index with %d vectors", len(embeddings))
        return len(embeddings)

    def add_vectors(self, embeddings: List[List[float]], metadata: List[Dict[str, Any]]) -> int:
        """Add new vectors to the existing index."""
        if not self.available:
            raise RuntimeError("FAISS is not available in this environment.")
        if not self.index:
            self._load_or_create_index()

        vectors = self._normalize_vectors(np.array(embeddings, dtype="float32"))
        self.index.add(vectors)
        self.metadata.extend(metadata)
        logger.info("Added %d vectors to FAISS index", len(embeddings))
        return len(embeddings)

    def search(self, query_vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Search the FAISS index for similar destinations."""
        if not self.available or not self.index:
            raise RuntimeError("FAISS is not available or index not initialized.")

        if len(query_vector) != self.dimension:
            raise ValueError(f"Query vector dimension {len(query_vector)} does not match index dimension {self.dimension}.")

        vector = np.array([query_vector], dtype="float32")
        vector = self._normalize_vectors(vector)

        distances, indices = self.index.search(vector, top_k)

        results: List[Dict[str, Any]] = []
        for score, idx in zip(distances[0], indices[0]):
            if idx == -1 or idx >= len(self.metadata):
                continue
            results.append({"score": float(score), "metadata": self.metadata[idx]})

        return results

    def status(self) -> Dict[str, Any]:
        """Return operational status for monitoring endpoints."""
        return {
            "available": self.available,
            "index_path": self.index_path,
            "metadata_path": self.metadata_path,
            "dimension": self.dimension,
            "index_size": self.index.ntotal if self.index else 0,
            "metadata_size": len(self.metadata),
        }

    @property
    def is_ready(self) -> bool:
        """Whether the index is available and populated."""
        return self.available and self.index is not None and self.index.ntotal > 0

