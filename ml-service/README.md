# Urban Manual ML Service

Machine Learning microservice for personalized travel recommendations and demand forecasting.

## Features

### 1. Collaborative Filtering
- **Algorithm**: LightFM (hybrid collaborative filtering)
- **Features**: User preferences (cities, categories, price) + destination attributes
- **Output**: "Users like you also visited" recommendations
- **Endpoint**: `/api/recommend/collaborative/{user_id}`

### 2. Demand Forecasting
- **Algorithm**: Prophet (time-series forecasting)
- **Features**: Historical view counts, seasonal patterns
- **Output**: Trending destinations, best visit times
- **Endpoints**:
  - `/api/forecast/demand` - Generate forecasts
  - `/api/forecast/trending` - Get trending destinations
  - `/api/forecast/best-time/{destination_id}` - Best times to visit

## Quick Start

### Using Docker

```bash
# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
nano .env

# Build and run
docker-compose up -d

# Check health
curl http://localhost:8000/health
```

### Manual Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export POSTGRES_URL="postgresql://..."

# Run the service
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Usage

### Train Models

```bash
# Train collaborative filtering model
curl -X POST "http://localhost:8000/api/recommend/train?epochs=30"

# Train forecasting models (top 200 destinations)
curl -X POST "http://localhost:8000/api/forecast/train?top_n=200&days_back=180"
```

### Get Recommendations

```bash
# Get recommendations for a user
curl "http://localhost:8000/api/recommend/collaborative/user123?top_n=20"

# Generate recommendations for all users and store in DB
curl -X POST "http://localhost:8000/api/recommend/collaborative/bulk?top_n=50&store_in_db=true"
```

### Get Forecasts

```bash
# Generate demand forecasts
curl "http://localhost:8000/api/forecast/demand?forecast_days=30&store_in_db=true"

# Get trending destinations
curl "http://localhost:8000/api/forecast/trending?min_trend=0.15"

# Get best times to visit a destination
curl "http://localhost:8000/api/forecast/best-time/123?top_n=5"
```

### Check Status

```bash
# Check service health
curl "http://localhost:8000/health"

# Check model status
curl "http://localhost:8000/api/recommend/status"
curl "http://localhost:8000/api/forecast/status"
```

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Architecture

```
ml-service/
├── app/
│   ├── api/
│   │   └── endpoints/
│   │       ├── recommendations.py   # Collaborative filtering endpoints
│   │       └── forecasting.py       # Demand forecasting endpoints
│   ├── models/
│   │   ├── collaborative_filtering.py  # LightFM model
│   │   └── demand_forecasting.py       # Prophet model
│   ├── utils/
│   │   └── database.py              # Database utilities
│   ├── config.py                    # Configuration settings
│   └── main.py                      # FastAPI app
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

## Database Tables

### Input Tables
- `destinations` - Destination metadata
- `visited_places` - User visit history
- `saved_places` - User saved items
- `user_interactions` - All user interactions

### Output Tables
- `personalization_scores` - Cached recommendation scores
- `forecasting_data` - Demand forecast results

## Model Training

### Collaborative Filtering
- Combines visited, saved, and interaction data
- Weights: visit=5, save=4, click=2, view=1
- Features: user preferences + destination attributes
- Training time: ~2-5 minutes for 1000 users

### Demand Forecasting
- Requires 30+ days of historical data
- Trains on top N destinations by views
- Generates 30-day forecasts by default
- Training time: ~1-3 minutes per 100 destinations

## Performance

- **Response Time**: < 500ms for recommendations
- **Training**: Can run in background mode
- **Caching**: Results stored in database with TTL
- **Fallback**: Graceful degradation if models untrained

## Deployment

### Railway.io

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Fly.io

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy
fly launch
```

### Environment Variables

Required:
- `POSTGRES_URL` - PostgreSQL connection string

Optional:
- `DEBUG` - Enable debug mode (default: false)
- `MODEL_CACHE_DIR` - Model storage path
- `MIN_INTERACTIONS` - Minimum interactions for training
- `TOP_DESTINATIONS_FOR_FORECAST` - Top N destinations to forecast
- `FORECAST_DAYS` - Forecast horizon

## Monitoring

```bash
# View logs
docker-compose logs -f ml-service

# Check resource usage
docker stats urban-manual-ml
```

## Troubleshooting

**Model not trained**
- Solution: Call `/api/recommend/train` or `/api/forecast/train`

**Insufficient data**
- Solution: Ensure at least 3 interactions per user and 30 days of historical data

**Memory issues**
- Solution: Reduce `top_n` parameter or train fewer destinations

**Slow training**
- Solution: Use `background=true` parameter for async training

## License

MIT
