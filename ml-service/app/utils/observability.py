"""Observability helpers for FastAPI."""

from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Deque, DefaultDict

from fastapi import FastAPI, Request
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.utils.logger import get_logger

logger = get_logger(__name__)
settings = get_settings()

REQUEST_LATENCY = Histogram(
    "ml_service_request_duration_seconds",
    "Request latency for ML service endpoints",
    labelnames=("method", "route"),
)
REQUEST_COUNTER = Counter(
    "ml_service_requests_total",
    "Total requests processed by ML service",
    labelnames=("method", "route", "status_code"),
)
ERROR_COUNTER = Counter(
    "ml_service_request_errors_total",
    "Total error responses served by ML service",
    labelnames=("route", "status_code"),
)


class AlertManager:
    """Simple in-process alerting for latency/error spikes."""

    def __init__(self, latency_threshold_ms: int, error_threshold_per_minute: int):
        self.latency_threshold_ms = latency_threshold_ms
        self.error_threshold = error_threshold_per_minute
        self.error_events: DefaultDict[str, Deque[float]] = defaultdict(deque)

    def track(self, route: str, duration_ms: float, status_code: int) -> None:
        if duration_ms > self.latency_threshold_ms:
            logger.warning(
                "Latency alert: %s exceeded %sms (%.2fms)",
                route,
                self.latency_threshold_ms,
                duration_ms,
            )

        if status_code >= 500:
            events = self.error_events[route]
            now = time.time()
            events.append(now)
            while events and now - events[0] > 60:
                events.popleft()

            if len(events) >= self.error_threshold:
                logger.error(
                    "Error-rate alert on %s: %s errors in last minute",
                    route,
                    len(events),
                )


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware that records Prometheus metrics and alerts."""

    def __init__(self, app: FastAPI, alert_manager: AlertManager):
        super().__init__(app)
        self.alert_manager = alert_manager

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        start = time.perf_counter()
        method = request.method
        route = request.url.path

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            REQUEST_LATENCY.labels(method=method, route=route).observe(duration_ms / 1000)
            REQUEST_COUNTER.labels(method=method, route=route, status_code="500").inc()
            ERROR_COUNTER.labels(route=route, status_code="500").inc()
            self.alert_manager.track(route, duration_ms, 500)
            raise

        duration_ms = (time.perf_counter() - start) * 1000
        status_code = response.status_code
        REQUEST_LATENCY.labels(method=method, route=route).observe(duration_ms / 1000)
        REQUEST_COUNTER.labels(method=method, route=route, status_code=str(status_code)).inc()
        if status_code >= 500:
            ERROR_COUNTER.labels(route=route, status_code=str(status_code)).inc()
        self.alert_manager.track(route, duration_ms, status_code)
        return response


def setup_observability(app: FastAPI) -> None:
    """Attach metrics middleware and Prometheus instrumentation."""
    Instrumentator().instrument(app).expose(app, include_in_schema=False)
    alert_manager = AlertManager(
        latency_threshold_ms=settings.latency_alert_threshold_ms,
        error_threshold_per_minute=settings.error_alert_threshold_per_minute,
    )
    app.add_middleware(MetricsMiddleware, alert_manager=alert_manager)
    _setup_tracing()


def _setup_tracing() -> None:
    """Configure OpenTelemetry tracing exporters."""
    resource = Resource.create({"service.name": settings.app_name, "service.version": settings.app_version})
    provider = TracerProvider(resource=resource)

    if settings.otlp_endpoint:
        exporter = OTLPSpanExporter(endpoint=settings.otlp_endpoint, insecure=True)
    else:
        exporter = ConsoleSpanExporter()

    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
