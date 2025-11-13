"""Contract validation utilities shared across the ML service."""

from __future__ import annotations

from typing import Any, Dict

from jsonschema import Draft7Validator

from app.contracts import load_itinerary_schema


def _build_schema(definition: str) -> Dict[str, Any]:
    schema = load_itinerary_schema()
    return {"$ref": f"#/$defs/{definition}", "$defs": schema.get("$defs", {})}


_request_validator = Draft7Validator(_build_schema("ItineraryOptimizationRequest"))
_response_validator = Draft7Validator(_build_schema("ItineraryOptimizationResponse"))


def validate_optimization_request(payload: Dict[str, Any]) -> None:
    """Validate an optimization request against the shared schema."""
    errors = sorted(_request_validator.iter_errors(payload), key=lambda err: err.path)
    if errors:
        messages = ", ".join(f"{'/'.join(map(str, err.path)) or 'root'}: {err.message}" for err in errors)
        raise ValueError(f"Itinerary request failed schema validation: {messages}")


def validate_optimization_response(payload: Dict[str, Any]) -> None:
    """Validate an optimization response against the shared schema."""
    errors = sorted(_response_validator.iter_errors(payload), key=lambda err: err.path)
    if errors:
        messages = ", ".join(f"{'/'.join(map(str, err.path)) or 'root'}: {err.message}" for err in errors)
        raise ValueError(f"Itinerary response failed schema validation: {messages}")
