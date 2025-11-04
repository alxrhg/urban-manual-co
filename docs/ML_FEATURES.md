# ML Features Documentation

This document describes the machine learning features implemented for Urban Manual.

## Overview

The ML microservice provides two main features:
1. **Collaborative Filtering** - Personalized recommendations based on user behavior
2. **Demand Forecasting** - Trending predictions and best visit times

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Next.js App   │────────▶│  ML Microservice │────────▶│  Supabase   │
│  (Port 3000)    │         │   (Port 8000)    │         │  (Postgres) │
└─────────────────┘         └──────────────────┘         └─────────────┘
        │                            │
        │                            │
        ▼                            ▼
   API Routes                  FastAPI + LightFM
   /api/ml/*                   + Prophet
```

## Features

### 1. Collaborative Filtering

**Algorithm:** LightFM Hybrid Model
- Combines collaborative filtering with content-based features
- Uses user preferences (cities, categories, price) + destination attributes
- Trained on visited places, saved places, and interactions

**Endpoints:**
- `POST /api/ml/recommend/train` - Train the model
- `GET /api/ml/recommend/{user_id}` - Get recommendations for user
- `POST /api/ml/recommend/bulk` - Generate for all users

**Frontend Integration:**
- `ForYouSection` component shows ML-powered recommendations
- Falls back to rule-based recommendations if ML unavailable
- Shows "ML-Powered" badge when using ML

**Training:**
```bash
curl -X POST "http://localhost:8000/api/recommend/train?epochs=30"
```

**Getting Recommendations:**
```bash
curl "http://localhost:8000/api/recommend/collaborative/user123?top_n=20"
```

### 2. Demand Forecasting

**Algorithm:** Prophet Time-Series Forecasting
- Analyzes historical view patterns
- Predicts 30-day demand trends
- Identifies trending destinations

**Endpoints:**
- `POST /api/ml/forecast/train` - Train forecasting models
- `GET /api/ml/forecast/demand` - Get demand forecasts
- `GET /api/ml/forecast/trending` - Get trending destinations
- `GET /api/ml/forecast/best-time/{destination_id}` - Best visit times

**Frontend Integration:**
- `TrendingSection` component shows ML-forecasted trending spots
- Displays trend percentage badges (e.g., "🔥 +25%")
- Shows "ML Forecasted" badge when using ML predictions

**Training:**
```bash
curl -X POST "http://localhost:8000/api/forecast/train?top_n=200&days_back=180"
```

**Getting Trending:**
```bash
curl "http://localhost:8000/api/forecast/trending?min_trend=0.15"
```

## Setup Instructions

### 1. Deploy ML Service

**Option A: Docker (Recommended)**
```bash
cd ml-service
cp .env.example .env
# Edit .env with your POSTGRES_URL
docker-compose up -d
```

**Option B: Local Development**
```bash
cd ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 2. Configure Next.js

Add to `.env.local`:
```bash
ML_SERVICE_URL=http://localhost:8000
```

For production:
```bash
ML_SERVICE_URL=https://your-ml-service.railway.app
```

### 3. Train Models

**Initial Training:**
```bash
# Train collaborative filtering
curl -X POST "http://localhost:8000/api/recommend/train?epochs=30"

# Train demand forecasting
curl -X POST "http://localhost:8000/api/forecast/train?top_n=200"

# Generate and cache recommendations
curl -X POST "http://localhost:8000/api/recommend/collaborative/bulk?store_in_db=true"

# Generate forecasts
curl "http://localhost:8000/api/forecast/demand?store_in_db=true"
```

**Automated Training (Cron):**
```bash
# Add to crontab for daily retraining
0 2 * * * curl -X POST "http://your-ml-service/api/recommend/train?background=true"
0 3 * * * curl -X POST "http://your-ml-service/api/forecast/train?background=true"
0 4 * * * curl -X POST "http://your-ml-service/api/recommend/collaborative/bulk?background=true&store_in_db=true"
```

### 4. Verify Integration

```bash
# Check ML service health
curl http://localhost:8000/health

# Check from Next.js
curl http://localhost:3000/api/ml/health

# Check model status
curl http://localhost:8000/api/recommend/status
curl http://localhost:8000/api/forecast/status
```

## API Reference

### Next.js Proxy Routes

All ML endpoints are proxied through Next.js for convenience:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/health` | GET | Health check |
| `/api/ml/recommend/{user_id}` | GET | User recommendations |
| `/api/ml/recommend/status` | GET | Model training status |
| `/api/ml/forecast/trending` | GET | Trending destinations |
| `/api/ml/forecast/best-time/{dest_id}` | GET | Best visit times |

### Direct ML Service Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health |
| `/api/recommend/train` | POST | Train CF model |
| `/api/recommend/collaborative/{user_id}` | GET | Get recommendations |
| `/api/recommend/collaborative/bulk` | POST | Bulk generation |
| `/api/recommend/status` | GET | CF status |
| `/api/forecast/train` | POST | Train forecasting |
| `/api/forecast/demand` | GET | Demand forecasts |
| `/api/forecast/trending` | GET | Trending list |
| `/api/forecast/best-time/{dest_id}` | GET | Best times |
| `/api/forecast/status` | GET | Forecast status |

## Data Flow

### Collaborative Filtering

1. **Training Phase:**
   ```
   visited_places + saved_places + user_interactions
      ↓
   Build interaction matrix with weights
      ↓
   Extract user features (preferences)
      ↓
   Extract item features (destination attributes)
      ↓
   Train LightFM model (WARP loss)
      ↓
   Save model state
   ```

2. **Inference Phase:**
   ```
   User ID
      ↓
   Load user/item embeddings
      ↓
   Predict scores for all destinations
      ↓
   Rank by score
      ↓
   Filter out already interacted
      ↓
   Return top N
   ```

### Demand Forecasting

1. **Training Phase:**
   ```
   Historical view counts (180 days)
      ↓
   Aggregate by destination + date
      ↓
   Train Prophet model per destination
      ↓
   Save models
   ```

2. **Inference Phase:**
   ```
   Trained model
      ↓
   Generate 30-day forecast
      ↓
   Calculate trend metrics
      ↓
   Identify trending (>15% growth)
      ↓
   Return predictions
   ```

## Performance

### Response Times
- Recommendations: < 100ms (cached) / < 500ms (fresh)
- Trending: < 200ms (cached)
- Best times: < 100ms (cached)

### Training Times
- Collaborative Filtering: ~2-5 minutes (1000 users)
- Demand Forecasting: ~1-3 minutes (100 destinations)

### Caching
- Recommendations: 5 minutes (Next.js) + 168 hours (DB)
- Trending: 1 hour
- Best times: 24 hours

## Graceful Degradation

The system is designed to degrade gracefully:

1. **ML Service Down:**
   - Falls back to existing rule-based recommendations
   - No user-facing errors
   - Logs warning for monitoring

2. **Model Not Trained:**
   - Returns empty results or error status
   - Frontend falls back to existing APIs
   - User experience unaffected

3. **Insufficient Data:**
   - Training fails with clear error message
   - Minimum 3 interactions per user required
   - Minimum 30 days of data for forecasting

## Monitoring

### Health Checks

```bash
# ML Service
curl http://localhost:8000/health

# Expected response:
{
  "status": "healthy",
  "service": "urban-manual-ml",
  "version": "1.0.0",
  "database": "connected"
}
```

### Model Status

```bash
curl http://localhost:8000/api/recommend/status

# Expected response:
{
  "status": "trained",
  "users_count": 1234,
  "destinations_count": 897,
  "trained_at": "2025-01-15T10:30:00"
}
```

### Logs

```bash
# Docker
docker-compose logs -f ml-service

# Direct
tail -f /var/log/ml-service.log
```

## Troubleshooting

### "Model not trained" Error

**Solution:**
```bash
curl -X POST "http://localhost:8000/api/recommend/train"
```

### "Insufficient interactions" Error

**Cause:** Less than 3 interactions in database
**Solution:** Wait for more user activity or lower MIN_INTERACTIONS

### "No forecast available" for Destination

**Cause:**
- Destination not in top 200 by views
- Less than 30 days of historical data

**Solution:**
- Increase `top_n` parameter in training
- Wait for more historical data

### ML Service Connection Timeout

**Check:**
1. Service is running: `docker ps`
2. Port is accessible: `curl http://localhost:8000/health`
3. Firewall settings
4. ML_SERVICE_URL environment variable

### Slow Training

**Solutions:**
- Reduce `epochs` parameter (default: 30)
- Reduce `top_n` for forecasting (default: 200)
- Use `background=true` for async training
- Increase server resources

## Database Schema

### Input Tables

- `destinations` - Destination catalog
- `visited_places` - User visit history
- `saved_places` - User bookmarks
- `user_interactions` - All tracked interactions

### Output Tables

- `personalization_scores` - Cached recommendations
  - Columns: user_id, destination_id, score, reason, expires_at
  - TTL: 168 hours

- `forecasting_data` - Demand forecasts
  - Columns: destination_id, forecast_window, predicted_trend, metadata
  - Updated: Daily

## Future Enhancements

1. **Real-time Model Updates**
   - Incremental learning
   - Online training

2. **Advanced Features**
   - Contextual bandits
   - Reinforcement learning
   - Multi-armed bandits for A/B testing

3. **Personalization**
   - Time-of-day preferences
   - Weather-based recommendations
   - Social network effects

4. **Analytics**
   - Model performance metrics
   - A/B testing framework
   - Recommendation diversity metrics

## Support

For issues or questions:
1. Check logs: `docker-compose logs ml-service`
2. Verify health: `curl http://localhost:8000/health`
3. Review documentation: `/ml-service/README.md`
4. Open issue on GitHub

## License

MIT
