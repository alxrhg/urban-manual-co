"""Simple filesystem-backed registry for ML artifacts."""

from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any, Optional

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

GRAPH_MODEL_ARTIFACT = "graph-sequencing/latest.pkl"


class ModelRegistry:
    """Persist ML artifacts on a shared filesystem."""

    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        logger.info("Model registry initialized at %s", self.base_path)

    def _resolve(self, name: str) -> Path:
        return self.base_path / name

    def save(self, name: str, payload: Any) -> bool:
        try:
            path = self._resolve(name)
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("wb") as handle:
                pickle.dump(payload, handle)
            logger.info("Saved model artifact %s", path)
            return True
        except Exception as exc:
            logger.error("Failed to persist model artifact %s: %s", name, exc)
            return False

    def load(self, name: str) -> Optional[Any]:
        path = self._resolve(name)
        if not path.exists():
            return None
        try:
            with path.open("rb") as handle:
                return pickle.load(handle)
        except Exception as exc:
            logger.error("Failed to load model artifact %s: %s", name, exc)
            return None

    def exists(self, name: str) -> bool:
        return self._resolve(name).exists()


model_registry = ModelRegistry(settings.model_storage_path)
