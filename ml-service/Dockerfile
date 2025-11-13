# syntax=docker/dockerfile:1

FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

FROM base AS builder
WORKDIR /opt/app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    curl \
    libpq-dev \
  && rm -rf /var/lib/apt/lists/*
COPY ml-service/requirements.txt ./requirements.txt
RUN python -m venv /opt/venv \
  && /opt/venv/bin/pip install --upgrade pip setuptools wheel \
  && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

FROM base AS runtime
ENV VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    MODEL_STORAGE_PATH=/app/storage/models \
    CONTRACTS_DIR=/contracts
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /opt/venv /opt/venv
COPY ml-service/app ./app
COPY contracts /contracts
RUN mkdir -p /app/storage/models /app/logs
RUN adduser --disabled-password --gecos '' mluser \
  && chown -R mluser:mluser /app /contracts
USER mluser
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:8000/health || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
