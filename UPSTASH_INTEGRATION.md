# Upstash Integration - Quick Start Guide

This guide covers the new semantic search and job scheduling features powered by Upstash.

## 🚀 What's New

### Semantic Search
- Vector-based search using OpenAI embeddings (1536 dimensions)
- Intelligent query understanding and ranking
- Combines Upstash Vector with Supabase data

### Scheduled Jobs
- Automated geocoding for destinations
- AI description generation
- Sitemap generation
- QStash-powered reliable delivery

### ML Service Embeddings
- New endpoints for generating embeddings
- Supports both text and destination documents
- Automatic fallback to OpenAI

## 📋 Quick Setup

### 1. Install Dependencies

Dependencies are already included in `package.json`:
```bash
npm install
```

### 2. Set Up Upstash Services

#### Upstash Vector (for semantic search)
1. Go to https://console.upstash.com/vector
2. Create a new index:
   - Name: `destinations`
   - Dimension: `1536`
   - Similarity: `Cosine`
3. Copy the REST URL and token

#### Upstash QStash (for job scheduling)
1. Go to https://console.upstash.com/qstash
2. Copy your QStash URL and token
3. Note your current and next signing keys

### 3. Configure Environment Variables

Add to your `.env.local`:

```bash
# Upstash Vector (semantic search)
UPSTASH_VECTOR_REST_URL=https://your-index.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your_vector_token

# Upstash QStash (job scheduling)
UPSTASH_QSTASH_URL=https://qstash.upstash.io
UPSTASH_QSTASH_TOKEN=your_qstash_token
UPSTASH_QSTASH_CURRENT_SIGNING_KEY=sig_xxx
UPSTASH_QSTASH_NEXT_SIGNING_KEY=sig_yyy

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-xxx

# Optional: ML Service
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_API_KEY=optional_api_key
```

### 4. Populate Vector Index

Run the reindex endpoint to populate your vector index:

```bash
# Initial population (all destinations)
curl -X POST http://localhost:3000/api/admin/reindex-destinations \
  -H "Content-Type: application/json" \
  -d '{"mode": "all", "batchSize": 20}'

# Or just changed destinations
curl -X POST http://localhost:3000/api/admin/reindex-destinations \
  -H "Content-Type: application/json" \
  -d '{"mode": "changed", "batchSize": 50}'
```

## 🔍 Using Semantic Search

### API Endpoint

```bash
POST /api/search/semantic
```

### Example Request

```bash
curl -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -d '{
    "query": "romantic restaurants with michelin stars in Paris",
    "limit": 10,
    "filters": {
      "city": "Paris"
    }
  }'
```

### Response

```json
{
  "results": [
    {
      "id": 123,
      "name": "Le Jules Verne",
      "city": "Paris",
      "michelin_stars": 1,
      "similarity_score": 0.92,
      ...
    }
  ],
  "count": 10,
  "query": "romantic restaurants with michelin stars in Paris"
}
```

## 🤖 ML Service Embeddings

### Start ML Service

```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Embed Text

```bash
curl -X POST http://localhost:8000/api/embed/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Best sushi restaurants in Tokyo"
  }'
```

### Embed Destination

```bash
curl -X POST http://localhost:8000/api/embed/destination \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sukiyabashi Jiro",
    "city": "Tokyo",
    "category": "Restaurant",
    "description": "Legendary sushi restaurant"
  }'
```

## 📅 Scheduled Jobs

### Available Jobs

1. **Geocode Missing** - Add coordinates to destinations
2. **Generate Descriptions** - Create AI descriptions
3. **Generate Sitemap** - Update SEO sitemap

### Manual Execution

```bash
# Geocode destinations without coordinates
curl -X POST http://localhost:3000/api/jobs/geocode-missing \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 20, "dryRun": false}'

# Generate AI descriptions
curl -X POST http://localhost:3000/api/jobs/generate-descriptions \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10, "dryRun": false}'

# Generate sitemap
curl -X POST http://localhost:3000/api/jobs/generate-sitemap \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

### Schedule with QStash

```bash
# Schedule weekly sitemap generation (Sundays at 2 AM)
curl -X POST https://qstash.upstash.io/v2/schedules \
  -H "Authorization: Bearer $UPSTASH_QSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "https://your-app.vercel.app/api/jobs/generate-sitemap",
    "cron": "0 2 * * 0",
    "body": "{\"dryRun\": false}"
  }'
```

## 🏗️ Architecture

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ Query
       ▼
┌─────────────────────┐
│  Semantic Search    │
│  API Route          │
└──────┬──────────────┘
       │
       ├──────────────┐
       ▼              ▼
┌─────────────┐  ┌──────────────┐
│ ML Service  │  │   OpenAI     │
│ (Embedding) │  │  (Fallback)  │
└──────┬──────┘  └──────┬───────┘
       │                │
       └────────┬───────┘
                ▼
       ┌─────────────────┐
       │ Upstash Vector  │
       │  (Similarity)   │
       └────────┬────────┘
                │ IDs
                ▼
       ┌─────────────────┐
       │    Supabase     │
       │  (Full Data)    │
       └─────────────────┘
```

## 📚 Documentation

- **Operations**: See `OPS_SEARCH_AND_INDEXING.md` for detailed runbook
- **Security**: See `SECURITY_REVIEW_UPSTASH.md` for security assessment
- **ML Integration**: See `ML_INTEGRATION.md` for ML service details
- **Vector Search**: See `VECTOR_SEARCH_SETUP.md` for setup guide

## 🐛 Troubleshooting

### Semantic search returns empty results

1. Check if vector index is populated:
   ```bash
   curl https://your-index.upstash.io/info \
     -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"
   ```

2. Verify embeddings are being generated:
   - Check ML service logs
   - Test OpenAI API key

3. Review application logs for errors

### Jobs fail with signature error

- Verify QStash signing keys are correct
- For local testing, ensure `UPSTASH_QSTASH_CURRENT_SIGNING_KEY` is not set
- Check QStash console for key rotation

### ML Service is unavailable

- The system automatically falls back to OpenAI
- Check `OPENAI_API_KEY` is set
- Verify network connectivity to ML service

## 🔐 Security Notes

- Never commit `.env.local` or environment files
- Use separate keys for staging/production
- Rotate QStash signing keys periodically
- Admin endpoints should be protected in production
- See `SECURITY_REVIEW_UPSTASH.md` for full security assessment

## 📊 Cost Estimation

Based on 1,000 destinations and 10,000 searches/day:

- **Upstash Vector**: Free tier (10k queries/day)
- **Upstash QStash**: Free tier (100 messages/day)
- **OpenAI Embeddings**: ~$0.02/month
- **Total**: < $1/month on free tiers

## 🎯 Next Steps

1. Set up Upstash accounts and create indexes
2. Configure environment variables
3. Run initial reindex to populate vector index
4. Test semantic search with sample queries
5. Schedule jobs via QStash
6. Monitor logs and performance
7. Set up production authentication for admin endpoints

## 📞 Support

For issues:
- Check documentation in `/docs` and markdown files
- Review logs in Vercel/hosting platform
- Check Upstash console for service status
- See `OPS_SEARCH_AND_INDEXING.md` for troubleshooting

---

**Last Updated**: 2025-11-14  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
