# ML Service

This directory contains the Python microservice that powers itinerary optimization, recommendations, forecasting, and observability features for Urban Manual.

## Setup

### Prerequisites
- Python 3.11+
- pip
- PostgreSQL / Supabase credentials

### Installation
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r ml-service/requirements.txt
```

### Environment Variables
Create a `.env` file with at least:
```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
POSTGRES_URL=postgresql://...
MODEL_STORAGE_PATH=/app/storage/models
```

## Contracts
The shared itinerary contract lives in [`/contracts/itinerary.schema.json`](../contracts/itinerary.schema.json). Both the Next.js API route and this service validate requests/responses against the same schema to prevent drift.

## Containerization
- Multi-stage Dockerfile pins every dependency and bakes the shared contracts:
  ```bash
  docker build -f ml-service/Dockerfile . -t urban-manual-ml-service:dev
  ```
- Local stack with persistent storage for trained models:
  ```bash
  cd ml-service
  docker compose up --build
  ```
  Model artifacts are written to the `ml-models` named volume and survive restarts.

## Observability
- `/health` and `/readiness` endpoints exist at both `/` and `/api/*` for orchestrators.
- Prometheus metrics are exposed at `/metrics` and include custom latency/error counters.
- Requests are logged with JSON formatting and mirrored to OpenTelemetry (set `OTEL_EXPORTER_OTLP_ENDPOINT` to push to your collector).
- Latency/error thresholds trigger structured alert logs for external alert managers to scrape.

## CI/CD
GitHub Actions build and publish the container image on merges to `main`, and a separate workflow can deploy the Kubernetes manifests in [`deploy/k8s`](../deploy/k8s) with rolling updates and HPA-backed autoscaling.
