# Operations Runbook: Search and Indexing

This runbook covers operations for semantic search, job scheduling, and vector indexing infrastructure.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Setup](#environment-setup)
3. [Semantic Search Operations](#semantic-search-operations)
4. [Job Scheduling with QStash](#job-scheduling-with-qstash)
5. [Vector Index Management](#vector-index-management)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
7. [Rollback Procedures](#rollback-procedures)
8. [Security](#security)

## Architecture Overview

### Components

- **Upstash Vector**: Managed vector database for semantic search (1536 dimensions, OpenAI text-embedding-3-small)
- **Upstash QStash**: Serverless message queue for scheduled jobs
- **ML Service**: Python microservice for generating embeddings (with OpenAI fallback)
- **Supabase**: Source of truth for all destination data
- **Next.js API Routes**: HTTP endpoints for search and job execution

### Data Flow

```
User Query → /api/search/semantic → ML Service (embedding) → Upstash Vector (search) → Supabase (fetch full data) → Response
```

## Environment Setup

### Required Environment Variables

```bash
# Upstash Vector
UPSTASH_VECTOR_REST_URL=https://your-index.upstash.io
UPSTASH_VECTOR_REST_TOKEN=your_token_here

# Upstash QStash
UPSTASH_QSTASH_URL=https://qstash.upstash.io
UPSTASH_QSTASH_TOKEN=your_qstash_token
UPSTASH_QSTASH_CURRENT_SIGNING_KEY=sig_xxx
UPSTASH_QSTASH_NEXT_SIGNING_KEY=sig_yyy

# ML Service
ML_SERVICE_URL=https://your-ml-service.railway.app
ML_SERVICE_API_KEY=your_api_key  # Optional

# OpenAI (fallback for embeddings)
OPENAI_API_KEY=sk-xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
# ⚠️  Never commit actual keys to version control!

# Google APIs (for jobs)
NEXT_PUBLIC_GOOGLE_API_KEY=AIzaxxx
GEMINI_API_KEY=AIzaxxx
```

### Verification

```bash
# Test semantic search
curl -X POST http://localhost:3000/api/search/semantic \
  -H "Content-Type: application/json" \
  -d '{"query": "romantic restaurants in Paris", "limit": 5}'

# Test admin reindex (dry run)
curl -X POST http://localhost:3000/api/admin/reindex-destinations \
  -H "Content-Type: application/json" \
  -d '{"mode": "changed", "batchSize": 5}'
```

## Semantic Search Operations

### Initial Setup

1. **Create Upstash Vector Index**
   - Go to https://console.upstash.com/vector
   - Create new index with dimension: 1536
   - Select region closest to your app
   - Copy REST URL and token to environment variables

2. **Initial Index Population**
   ```bash
   curl -X POST https://your-app.vercel.app/api/admin/reindex-destinations \
     -H "Content-Type: application/json" \
     -d '{"mode": "all", "batchSize": 20}'
   ```

3. **Verify Index**
   ```bash
   curl -X POST https://your-app.vercel.app/api/search/semantic \
     -H "Content-Type: application/json" \
     -d '{"query": "test query", "limit": 1}'
   ```

### Maintenance

**Incremental Reindexing** (only changed destinations):
```bash
curl -X POST https://your-app.vercel.app/api/admin/reindex-destinations \
  -H "Content-Type: application/json" \
  -d '{"mode": "changed", "batchSize": 50}'
```

**Full Reindexing** (all destinations):
```bash
curl -X POST https://your-app.vercel.app/api/admin/reindex-destinations \
  -H "Content-Type: application/json" \
  -d '{"mode": "all", "batchSize": 20}'
```

### Performance Tuning

- **Batch Size**: Adjust based on rate limits (10-50 recommended)
- **Embedding Model**: Currently using text-embedding-3-small (1536 dim)
- **Vector Dimension**: Match with embedding model output

## Job Scheduling with QStash

### Available Jobs

1. **Geocode Missing Destinations**
   - Endpoint: `/api/jobs/geocode-missing`
   - Purpose: Add coordinates to destinations without lat/long
   - Rate: ~100ms per destination (Google API)

2. **Generate Descriptions**
   - Endpoint: `/api/jobs/generate-descriptions`
   - Purpose: Create AI descriptions for destinations
   - Rate: ~500ms per destination (Gemini API)

3. **Generate Sitemap**
   - Endpoint: `/api/jobs/generate-sitemap`
   - Purpose: Update sitemap.xml for SEO
   - Rate: Fast (database query only)

### Schedule Jobs via QStash

**One-time job**:
```bash
curl -X POST https://qstash.upstash.io/v2/publish/https://your-app.vercel.app/api/jobs/geocode-missing \
  -H "Authorization: Bearer $UPSTASH_QSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 20}'
```

**Scheduled job** (weekly sitemap generation):
```bash
curl -X POST https://qstash.upstash.io/v2/schedules \
  -H "Authorization: Bearer $UPSTASH_QSTASH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "destination": "https://your-app.vercel.app/api/jobs/generate-sitemap",
    "cron": "0 2 * * 0",
    "body": "{\"dryRun\": false}"
  }'
```

### Manual Job Execution

Local testing without QStash signature:
```bash
# Geocode missing destinations
curl -X POST http://localhost:3000/api/jobs/geocode-missing \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 10, "dryRun": true}'

# Generate descriptions
curl -X POST http://localhost:3000/api/jobs/generate-descriptions \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 5, "dryRun": true}'

# Generate sitemap
curl -X POST http://localhost:3000/api/jobs/generate-sitemap \
  -H "Content-Type: application/json" \
  -d '{"dryRun": false}'
```

## Vector Index Management

### Clear Entire Index
```bash
# Use Upstash Console or API
curl -X POST https://your-index.upstash.io/reset \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"
```

### Delete Specific Destination
```bash
curl -X DELETE https://your-index.upstash.io/delete/dest-123 \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"
```

### Check Index Statistics
```bash
curl -X GET https://your-index.upstash.io/info \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"
```

## Monitoring and Troubleshooting

### Common Issues

**Issue: Semantic search returns no results**
- Check if vector index is populated: See index info
- Verify ML service is running: `curl $ML_SERVICE_URL/health`
- Check OpenAI API key if ML service is down
- Review logs for embedding generation errors

**Issue: Job fails with QStash signature error**
- Verify `UPSTASH_QSTASH_CURRENT_SIGNING_KEY` is correct
- Check QStash console for signing key rotation
- For local testing, ensure env var is not set (bypasses verification)

**Issue: Rate limit errors from Google/OpenAI APIs**
- Reduce batch size in job requests
- Increase delay between requests (edit job route)
- Check API quota in respective consoles

**Issue: Embeddings are stale after content updates**
- Run incremental reindex: `mode: "changed"`
- Check `last_indexed_at` column in Supabase
- Verify `updated_at` trigger is working

### Logs and Metrics

**Check job execution logs**:
```bash
# Vercel logs
vercel logs --since=1h

# Or in Vercel dashboard under Deployments > Logs
```

**Monitor QStash jobs**:
- Go to https://console.upstash.com/qstash
- View "Messages" for delivery status
- Check "Dead Letter Queue" for failed jobs

**Vector search metrics**:
- Track query latency in application logs
- Monitor embedding generation time
- Check Supabase performance insights

## Rollback Procedures

### Disable Semantic Search

1. **Remove from frontend**:
   - Comment out semantic search API calls
   - Fall back to existing Postgres full-text search

2. **Disable API routes**:
   - Set feature flag or remove routes temporarily
   - Or return 503 from `/api/search/semantic`

### Pause QStash Schedules

```bash
# List all schedules
curl -X GET https://qstash.upstash.io/v2/schedules \
  -H "Authorization: Bearer $UPSTASH_QSTASH_TOKEN"

# Pause a schedule
curl -X POST https://qstash.upstash.io/v2/schedules/{schedule-id}/pause \
  -H "Authorization: Bearer $UPSTASH_QSTASH_TOKEN"

# Delete a schedule
curl -X DELETE https://qstash.upstash.io/v2/schedules/{schedule-id} \
  -H "Authorization: Bearer $UPSTASH_QSTASH_TOKEN"
```

### Clear Vector Index

If index becomes corrupted:
```bash
# Reset entire index
curl -X POST https://your-index.upstash.io/reset \
  -H "Authorization: Bearer $UPSTASH_VECTOR_REST_TOKEN"

# Re-populate from scratch
curl -X POST https://your-app.vercel.app/api/admin/reindex-destinations \
  -d '{"mode": "all", "batchSize": 20}'
```

### Revert Deployment

```bash
# Vercel
vercel rollback <previous-deployment-url>

# Or in Vercel dashboard: Deployments > [...] > Promote to Production
```

## Security

### Secret Management

**Never commit these to git**:
- `UPSTASH_VECTOR_REST_TOKEN`
- `UPSTASH_QSTASH_TOKEN`
- `UPSTASH_QSTASH_CURRENT_SIGNING_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_GOOGLE_API_KEY`

**Best practices**:
- Use environment variables in Vercel/hosting platform
- Rotate QStash signing keys periodically
- Use separate keys for staging/production
- Restrict Supabase service role key to server-side only

### API Rate Limiting

Jobs implement internal rate limiting:
- Geocoding: 100ms delay between requests
- Description generation: 500ms delay between requests
- Reindexing: 100ms delay between batches

### Access Control

- Admin routes (reindex) should be protected by auth middleware
- QStash jobs verify signatures in production
- Public search endpoint uses rate limiting via Upstash Redis

## Cost Estimation

**Upstash Vector**:
- Free tier: 10,000 queries/day
- Typical: $0.001 per 1,000 queries above free tier

**Upstash QStash**:
- Free tier: 100 messages/day
- Typical: $1 per 100,000 messages

**OpenAI Embeddings**:
- text-embedding-3-small: $0.02 per 1M tokens
- Typical: ~1,000 destinations = ~$0.02

**Estimated Monthly Cost** (for 1,000 destinations, 10k searches/day):
- Upstash Vector: Free tier sufficient
- Upstash QStash: Free tier sufficient (weekly jobs)
- OpenAI: ~$0.02/month for embeddings
- **Total: < $1/month**

## Support and Escalation

**For issues**:
1. Check this runbook first
2. Review application logs
3. Check Upstash console for service status
4. Contact support:
   - Upstash: support@upstash.com
   - Vercel: vercel.com/support

**Emergency contacts**:
- On-call engineer: [Add contact info]
- DevOps lead: [Add contact info]
