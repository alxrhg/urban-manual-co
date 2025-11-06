# ML Service Integration Guide

**Status**: ✅ **ML service is now integrated!** The app will use ML-powered recommendations when the service is available.

## What's Been Integrated

Your Urban Manual app now has **ML-powered components** that automatically enhance recommendations when the ML service is running:

### New Components Added:
- ✅ **ForYouSectionML** - ML-powered personalized recommendations (collaborative filtering)
- ✅ **TrendingSectionML** - ML-powered trending destination detection
- ✅ Both components have automatic fallback to regular recommendations if ML service unavailable

### How It Works:
1. **When ML service is running**: Users see enhanced recommendations with "AI" badge
2. **When ML service is offline**: Users see standard recommendations (seamless fallback)
3. **No configuration required**: Components detect ML service automatically

---

## Quick Start (2 Options)

### Option 1: Run ML Service Locally (Recommended for Development)

#### Linux/macOS:
```bash
cd ml-service
./start-local.sh
```

#### Windows:
```bash
cd ml-service
start-local.bat
```

The script will:
1. Check Python version (requires 3.11+)
2. Create virtual environment
3. Install dependencies
4. Start service on http://localhost:8000

#### Then start your Next.js app:
```bash
# In another terminal
npm run dev
```

Visit http://localhost:3000 and you'll see:
- "For You" section with AI badge (ML-powered)
- "Trending" section with ML predictions

---

### Option 2: Deploy ML Service to Cloud

The ML service is a standard Python FastAPI app. Deploy to any platform:

#### Railway (Easiest):
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy from ml-service directory
cd ml-service
railway up

# Get your service URL
railway domain

# Add to your Next.js environment variables
# ML_SERVICE_URL=https://your-service.railway.app
```

#### Fly.io:
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
cd ml-service
fly launch
fly deploy

# Get URL and add to environment:
# ML_SERVICE_URL=https://your-service.fly.dev
```

#### Docker (Any Platform):
```bash
# Build
docker build -f ml-service/Dockerfile.production -t urban-ml-service .

# Run
docker run -p 8000:8000 \
  -e DATABASE_URL=$DATABASE_URL \
  urban-ml-service

# Or deploy to:
# - Google Cloud Run
# - AWS ECS/Fargate
# - DigitalOcean App Platform
# - Any Docker host
```

---

## Configuration

### Environment Variables

Add to your `.env.local` (Next.js):

```bash
# ML Service URL
ML_SERVICE_URL=http://localhost:8000  # Local
# OR
ML_SERVICE_URL=https://your-ml-service.railway.app  # Production
```

Add to `ml-service/.env`:

```bash
# Database (Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres

# Optional: Logging
LOG_LEVEL=INFO
```

---

## Verify Integration

### 1. Check ML Service Health
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "database": "connected"
}
```

### 2. Check Next.js Can Reach ML Service
```bash
curl http://localhost:3000/api/ml/status
```

Expected response:
```json
{
  "available": true,
  "service": "ml-service",
  "latency": 45
}
```

### 3. Test Recommendations
```bash
# Login to your app first, then:
curl http://localhost:3000/api/ml/recommend?top_n=5
```

Expected response:
```json
{
  "recommendations": [
    {
      "destination_id": 123,
      "score": 0.85,
      "reason": "Based on similar users' preferences"
    }
  ],
  "ml_powered": true
}
```

### 4. Check UI
Visit http://localhost:3000 when logged in:
- Look for "For You" section with sparkle icon (✨) and "AI" badge
- Look for "Trending" section with ML predictions
- Hover over recommendations to see ML confidence scores

---

## How the ML Components Work

### ForYouSectionML
```typescript
// Automatically uses ML service when available
<ForYouSectionML />

// Features:
// - Shows ML confidence scores on hover
// - Displays "AI" badge when using ML
// - Falls back to standard recommendations if ML unavailable
// - Tracks ML-specific analytics
```

### TrendingSectionML
```typescript
// Uses ML forecasting for trending predictions
<TrendingSectionML />

// Features:
// - Prophet-based time series forecasting
// - Predicts upcoming trending destinations
// - Falls back to standard trending if ML unavailable
```

---

## Cost Estimates

### Running ML Service:

| Platform | Cost (Monthly) | Setup Time |
|----------|---------------|------------|
| **Local (dev)** | $0 | 2 minutes |
| **Railway** | $5-10 (500MB RAM) | 5 minutes |
| **Fly.io** | $5-15 (shared CPU) | 5 minutes |
| **Cloud Run** | $5-20 (pay per request) | 10 minutes |
| **DigitalOcean** | $12 (basic droplet) | 10 minutes |

### Recommendation:
- **Development**: Run locally ($0)
- **Production (<10K users)**: Railway or Fly.io ($5-10/month)
- **Production (>10K users)**: Cloud Run with auto-scaling

---

## Monitoring

### Check Service Status

Add to your monitoring:
```bash
# Health check endpoint
GET /health

# Expected response time: <100ms
# Alert if: response time >1s or status != 200
```

### Key Metrics to Track:

1. **ML Service Uptime**
   - Target: 99.9%
   - Alert: If down >5 minutes

2. **Response Time**
   - Target: <500ms
   - Alert: If p95 >1s

3. **Recommendation Quality**
   - Track: Click-through rate on ML recommendations
   - Compare: ML vs standard recommendations

4. **Fallback Rate**
   - Track: % of requests using fallback
   - Alert: If >10%

---

## Troubleshooting

### ML Service Won't Start

**Issue**: `ModuleNotFoundError: No module named 'lightfm'`

**Solution**:
```bash
cd ml-service
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Issue**: `Database connection failed`

**Solution**: Check your `DATABASE_URL` in `ml-service/.env`:
```bash
# Get from Supabase Dashboard > Project Settings > Database
# Use "Connection pooling" URL (port 6543)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres
```

### Next.js Can't Connect to ML Service

**Issue**: `ML service unavailable` in browser console

**Solutions**:

1. **Check ML service is running**:
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check environment variable**:
   ```bash
   # In your .env.local
   echo $ML_SERVICE_URL
   # Should be: http://localhost:8000
   ```

3. **Check CORS** (if ML service on different domain):
   ```python
   # ml-service/app/main.py
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-app.vercel.app"],  # Add your domain
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

### Recommendations Not Showing

**Issue**: No "For You" section appears

**Possible causes**:
1. **User not logged in** (ML recommendations only show for authenticated users)
2. **No user activity** (need some visits/saves to generate recommendations)
3. **City/category filter active** (components hide when filters applied)

**Debug**:
```bash
# Check if API returns recommendations
curl -H "Cookie: your-session-cookie" \
  http://localhost:3000/api/ml/recommend?top_n=5

# Should return array of recommendations
```

### Low-Quality Recommendations

**Issue**: ML recommendations seem random

**Causes**:
1. **Insufficient training data** (need >100 users with activity)
2. **Cold start problem** (new user with no history)
3. **Model not trained yet**

**Solutions**:
1. **Let it collect data**: ML improves with more user interactions
2. **Train the model**: Run training script periodically
3. **Adjust fallback**: Increase confidence threshold for ML

---

## Disabling ML Service

If you want to temporarily disable ML without stopping the service:

### Option 1: Comment out in code
```tsx
// app/page.tsx

// Temporarily disable
{/* <ForYouSectionML /> */}
{/* <TrendingSectionML /> */}

// Use standard components only
<SmartRecommendations />
<TrendingSection />
```

### Option 2: Remove environment variable
```bash
# Remove or comment out in .env.local
# ML_SERVICE_URL=http://localhost:8000
```

The components will automatically fall back to standard recommendations.

---

## Performance Tips

### 1. Enable Caching

The ML service supports response caching:

```python
# ml-service/app/config.py
CACHE_TTL = 3600  # Cache recommendations for 1 hour
```

### 2. Connection Pooling

Already configured in `ml-service/app/utils/database.py`:
```python
init_db_pool(minconn=2, maxconn=10)
```

### 3. Request Timeout

API routes have 5-second timeout:
```typescript
// app/api/ml/recommend/route.ts
signal: AbortSignal.timeout(5000)
```

Adjust if needed for slower networks.

---

## Next Steps

1. ✅ **You're done!** ML service is integrated
2. **Start ML service** using `start-local.sh` or `start-local.bat`
3. **Deploy to production** when ready (Railway/Fly.io recommended)
4. **Monitor performance** and recommendation quality
5. **Train models periodically** as user base grows

### Optional Enhancements:

- **A/B Testing**: Compare ML vs standard recommendations
- **Model Retraining**: Set up periodic model updates
- **Advanced Features**: Add location-based recommendations
- **Analytics**: Track ML recommendation performance

---

## Questions?

- 📖 ML service docs: [`ml-service/README.md`](./ml-service/README.md)
- 🏗️ Architecture: [`MICROSERVICES_ARCHITECTURE.md`](./MICROSERVICES_ARCHITECTURE.md)
- 🚀 Quick start: [`QUICKSTART_OPTIONAL_SERVICES.md`](./QUICKSTART_OPTIONAL_SERVICES.md)

---

**Last Updated**: 2025-11-06
**Status**: ✅ Integrated and ready to use
