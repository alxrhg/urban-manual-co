# Urban Manual ML Service

Python-based machine learning microservice for the Urban Manual travel app, providing:
- **Collaborative Filtering** recommendations using LightFM
- **Demand Forecasting** using Prophet
- Personalized travel suggestions
- Trending destination detection
- Peak time analysis

## 🏗️ Architecture

```
ml-service/
├── app/
│   ├── api/              # FastAPI endpoints
│   │   ├── health.py     # Health check
│   │   ├── recommendations.py  # Collaborative filtering
│   │   └── forecast.py   # Demand forecasting
│   ├── models/           # ML models
│   │   ├── collaborative_filtering.py  # LightFM model
│   │   └── demand_forecast.py          # Prophet model
│   ├── utils/            # Utilities
│   │   ├── database.py   # Supabase connection
│   │   ├── data_fetcher.py  # Data retrieval
│   │   └── logger.py     # Logging
│   ├── config.py         # Configuration
│   └── main.py           # FastAPI app
├── Dockerfile
├── requirements.txt
└── .env
```

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL (via Supabase)
- Docker (optional)

### Local Development

#### Option 1: Using uv (Recommended - 10-100x faster! 🚀)

We've migrated to [uv](https://github.com/astral-sh/uv), the most admired Python tool in Stack Overflow 2025 Survey (74.2%)!

1. **Install uv:**
```bash
# macOS and Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or via pip
pip install uv
```

2. **Install dependencies with uv:**
```bash
cd ml-service
uv pip install -r requirements.txt

# Or sync from pyproject.toml
uv sync
```

3. **Run the service:**
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Why uv?**
- 🦀 Built in Rust - blazing fast!
- ⚡ 10-100x faster dependency resolution than pip
- 📦 Fully compatible with pip/requirements.txt
- 🎯 More reliable dependency solving

Benchmark: `pip install ~45s` → `uv install ~3s` (15x faster!)

#### Option 2: Using pip (Traditional)

1. **Create virtual environment:**
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. **Run the service:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. **Access the API:**
- Health check: http://localhost:8000/health
- API docs: http://localhost:8000/docs
- OpenAPI spec: http://localhost:8000/openapi.json

### Docker Deployment

1. **Build the image:**
```bash
docker build -t urban-manual-ml .
```

2. **Run the container:**
```bash
docker run -d \
  --name ml-service \
  -p 8000:8000 \
  --env-file .env \
  urban-manual-ml
```

3. **Check logs:**
```bash
docker logs -f ml-service
```

## 📊 API Endpoints

### Health & Status

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-04T12:00:00Z",
  "service": "Urban Manual ML Service",
  "version": "1.0.0",
  "database": "connected"
}
```

### Recommendations

#### `POST /api/recommend/collaborative`
Get collaborative filtering recommendations for a user.

**Request:**
```json
{
  "user_id": "uuid",
  "top_n": 10,
  "exclude_visited": true,
  "exclude_saved": true
}
```

**Response:**
```json
{
  "user_id": "uuid",
  "recommendations": [
    {
      "destination_id": 123,
      "slug": "restaurant-name",
      "name": "Restaurant Name",
      "city": "Paris",
      "category": "Restaurants",
      "score": 0.85,
      "reason": "Users with similar preferences also liked this"
    }
  ],
  "total": 10,
  "model_version": "lightfm-v1",
  "generated_at": "2025-11-04T12:00:00Z"
}
```

#### `GET /api/recommend/collaborative/{user_id}`
Get recommendations (GET variant).

**Query Parameters:**
- `top_n` (default: 10): Number of recommendations
- `exclude_visited` (default: true): Exclude visited destinations
- `exclude_saved` (default: true): Exclude saved destinations

#### `POST /api/recommend/train`
Train the collaborative filtering model.

**Request:**
```json
{
  "epochs": 50,
  "num_threads": 4
}
```

**Response:**
```json
{
  "status": "training_started",
  "message": "Model training started in background. Check /model/status for progress."
}
```

#### `GET /api/recommend/model/status`
Get model training status.

**Response:**
```json
{
  "is_trained": true,
  "trained_at": "2025-11-04T12:00:00Z",
  "num_users": 1234,
  "num_items": 897,
  "model_type": "LightFM WARP",
  "status": "ready"
}
```

### Forecasting

#### `GET /api/forecast/demand/{destination_id}`
Get demand forecast for a destination.

**Query Parameters:**
- `periods` (default: 30): Number of days to forecast

**Response:**
```json
{
  "destination_id": 123,
  "forecast": [
    {
      "date": "2025-11-05",
      "demand": 145.3,
      "lower_bound": 120.5,
      "upper_bound": 170.1
    }
  ],
  "generated_at": "2025-11-04T12:00:00Z"
}
```

#### `GET /api/forecast/trending`
Get trending destinations based on forecast growth.

**Query Parameters:**
- `top_n` (default: 20): Number of trending destinations
- `forecast_days` (default: 7): Days ahead to analyze

**Response:**
```json
{
  "trending": [
    {
      "destination_id": 123,
      "slug": "destination-name",
      "name": "Destination Name",
      "city": "Paris",
      "category": "Restaurants",
      "growth_rate": 0.35,
      "current_demand": 100.0,
      "forecast_demand": 135.0
    }
  ],
  "total": 20,
  "generated_at": "2025-11-04T12:00:00Z"
}
```

#### `GET /api/forecast/peak-times/{destination_id}`
Get peak and low demand times.

**Query Parameters:**
- `forecast_days` (default: 30): Days to analyze

**Response:**
```json
{
  "destination_id": 123,
  "peak_date": "2025-11-15",
  "peak_demand": 200.5,
  "low_date": "2025-11-08",
  "low_demand": 80.3,
  "average_demand": 140.2,
  "forecast_period_days": 30,
  "recommendation": "Visit during November 08 for a quieter experience..."
}
```

#### `POST /api/forecast/train`
Train forecast models for top destinations.

**Request:**
```json
{
  "top_n": 200,
  "historical_days": 180
}
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PostgreSQL Direct Connection
POSTGRES_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# ML Service Configuration
ML_SERVICE_PORT=8000
ML_SERVICE_HOST=0.0.0.0
LOG_LEVEL=INFO

# Model Configuration
LIGHTFM_EPOCHS=50
LIGHTFM_THREADS=4
PROPHET_SEASONALITY_MODE=multiplicative
CACHE_TTL_HOURS=24

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=60
```

## 🧪 Testing

Run tests:
```bash
pytest tests/ -v
```

## 📈 Model Training

### Initial Setup

After deploying the service, you need to train both models:

1. **Train Collaborative Filtering:**
```bash
curl -X POST http://localhost:8000/api/recommend/train \
  -H "Content-Type: application/json" \
  -d '{"epochs": 50, "num_threads": 4}'
```

2. **Train Demand Forecasting:**
```bash
curl -X POST http://localhost:8000/api/forecast/train \
  -H "Content-Type: application/json" \
  -d '{"top_n": 200, "historical_days": 180}'
```

3. **Check Status:**
```bash
# Recommendations model
curl http://localhost:8000/api/recommend/model/status

# Forecasting model
curl http://localhost:8000/api/forecast/status
```

### Retraining Schedule

Recommended retraining frequency:
- **Collaborative Filtering:** Weekly (to capture new user preferences)
- **Demand Forecasting:** Daily (for fresh trend data)

Set up cron jobs or use your deployment platform's scheduler.

## 🚢 Deployment

### Railway

1. Create new project on Railway
2. Add PostgreSQL database (or use existing Supabase)
3. Deploy from GitHub:
```bash
railway up
```

4. Set environment variables in Railway dashboard
5. Expose service on public URL

### Fly.io

1. Install Fly CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Create app:
```bash
fly launch
```

3. Set secrets:
```bash
fly secrets set POSTGRES_URL=postgresql://...
fly secrets set SUPABASE_URL=https://...
# ... other secrets
```

4. Deploy:
```bash
fly deploy
```

### Docker Compose

For local development with all services:

```yaml
# docker-compose.yml
version: '3.8'
services:
  ml-service:
    build: ./ml-service
    ports:
      - "8000:8000"
    env_file:
      - ./ml-service/.env
    depends_on:
      - postgres
```

## 🔍 Monitoring

### Logs

JSON-formatted logs are written to stdout:
```json
{
  "timestamp": "2025-11-04T12:00:00Z",
  "name": "app.api.recommendations",
  "level": "INFO",
  "message": "Getting recommendations for user abc123"
}
```

### Metrics

Monitor these endpoints:
- `/health` - Overall service health
- `/api/recommend/model/status` - Recommendation model status
- `/api/forecast/status` - Forecast model status

## 🐛 Troubleshooting

### Model Not Trained

**Error:** `Model not trained yet. Please train the model first.`

**Solution:** Train the model using the `/train` endpoint.

### Database Connection Failed

**Error:** `Database error: connection refused`

**Solution:** Check `POSTGRES_URL` in `.env` and verify Supabase is accessible.

### Insufficient Data

**Error:** `Not enough interaction data for training`

**Solution:** Ensure you have:
- At least 10 user interactions
- Multiple users (>5)
- Data from the last 6 months

### Timeout Errors

**Error:** Request timeout from Next.js

**Solution:**
- Increase timeout in Next.js proxy routes
- Optimize model performance
- Use caching for frequent requests

## 🔐 Security

- Database connections use SSL
- Service role key required for admin operations
- Rate limiting enabled (60 req/min default)
- CORS configured for production domains
- Non-root user in Docker container

## 📝 License

Same as parent project (Urban Manual).

## 🤝 Contributing

1. Follow Python PEP 8 style guide
2. Add tests for new features
3. Update documentation
4. Run linter before committing:
```bash
black app/
flake8 app/
mypy app/
```

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check API documentation at `/docs`
- Review logs for error messages
