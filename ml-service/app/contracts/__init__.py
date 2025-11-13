"""Shared contract helpers for schema validation."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)


def _default_contract_path() -> Path:
    """Resolve the default path to the shared contracts directory."""
    current = Path(__file__).resolve()
    parents = current.parents
    repo_root = parents[3] if len(parents) >= 4 else parents[-1]
    return repo_root / "contracts" / "itinerary.schema.json"


def _get_contract_path() -> Path:
    """Return the configured contract path."""
    settings = get_settings()
    if settings.contracts_dir:
        candidate = Path(settings.contracts_dir) / "itinerary.schema.json"
        if candidate.exists():
            return candidate
        logger.warning(
            "Configured contracts directory %s missing itinerary.schema.json, falling back to default",
            settings.contracts_dir,
        )
    return _default_contract_path()


@lru_cache()
def load_itinerary_schema() -> Dict[str, Any]:
    """Load the shared itinerary schema from disk."""
    schema_path = _get_contract_path()
    if not schema_path.exists():
        raise FileNotFoundError(f"Itinerary schema not found at {schema_path}")

    logger.info("Loading itinerary schema from %s", schema_path)
    with schema_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)
