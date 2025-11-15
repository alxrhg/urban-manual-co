# Search & Workflow Features

This document describes the advanced search and workflow automation features implemented with Upstash.

## Search Endpoints

### 1. Typeahead Suggestions

**Endpoint:** `GET /api/search/suggest?q={query}&limit={limit}`

Fast keyword-based autocomplete for destination names, cities, and categories.

**Example:**
```bash
curl "https://your-app.vercel.app/api/search/suggest?q=paris&limit=10"
```

**Response:**
```json
{
  "query": "paris",
  "suggestions": {
    "destinations": [...],
    "cities": ["Paris, France"],
    "categories": ["Restaurant", "Hotel"]
  },
  "total": 15
}
```

**Performance:** < 50ms typical response time

---

### 2. Hybrid Combined Search

**Endpoint:** `POST /api/search/combined`

Combines keyword matching with semantic vector search for best results.

**Request:**
```json
{
  "query": "romantic restaurants with michelin stars",
  "limit": 20,
  "filters": {
    "city": "Paris",
    "category": "Restaurant"
  }
}
```

**Response:**
```json
{
  "query": "romantic restaurants...",
  "results": [...],
  "total": 20,
  "method": "hybrid",
  "candidatesEvaluated": 45
}
```

**How it works:**
1. Fast keyword search gets top 100 candidates
2. Vector search scores candidates for semantic relevance
3. Results ranked by semantic similarity + popularity
4. Falls back to keyword-only if vector search fails

---

### 3. Semantic Search

**Endpoint:** `POST /api/search/semantic`

Pure semantic search using vector embeddings (already implemented).

**Request:**
```json
{
  "query": "cozy spots for a romantic dinner",
  "limit": 10,
  "filters": {
    "city": "Paris"
  }
}
```

---

## Workflow Automation

### Destination Ingestion Workflow

**Endpoint:** `POST /api/workflows/ingest-destination`

Multi-step pipeline for adding/updating destinations:
1. Fetch destination from Supabase
2. Geocode (if missing coordinates)
3. Generate AI description (if missing)
4. Generate embedding
5. Upsert to Upstash Vector
6. Update last_indexed_at timestamp

**Request:**
```json
{
  "destinationId": 123,
  "skipGeocoding": false,
  "skipDescription": false
}
```

**Response:**
```json
{
  "success": true,
  "destinationId": 123,
  "workflow": [
    {
      "step": "fetch_destination",
      "status": "completed",
      "duration_ms": 45
    },
    {
      "step": "geocode",
      "status": "completed",
      "duration_ms": 1200
    },
    {
      "step": "generate_description",
      "status": "completed",
      "duration_ms": 2500
    },
    {
      "step": "generate_embedding",
      "status": "completed",
      "duration_ms": 350
    },
    {
      "step": "upsert_vector",
      "status": "completed",
      "duration_ms": 120
    },
    {
      "step": "update_supabase",
      "status": "completed",
      "duration_ms": 55
    }
  ],
  "total_duration_ms": 4270
}
```

**Use cases:**
- Onboarding new destinations
- Reprocessing destinations after content updates
- Batch ingestion with QStash

---

## Database Migrations

### Add last_indexed_at Column

Run the migration to enable incremental reindexing:

```bash
# In Supabase SQL Editor
psql -f migrations/add_last_indexed_at.sql
```

Or manually:
```sql
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_destinations_last_indexed_at 
ON destinations(last_indexed_at);
```

This enables:
- Incremental reindexing (only changed destinations)
- Efficient querying of stale destinations
- Tracking of indexing status

---

## Integration with Admin UI

The admin reindex tab at `/admin?tab=reindex` uses these features:

**"Changed Only" mode:**
- Queries destinations WHERE `updated_at > last_indexed_at` OR `last_indexed_at IS NULL`
- Only processes destinations that changed since last index
- Fast and efficient for regular updates

**"All Destinations" mode:**
- Reindexes everything
- Use for initial setup or model changes
- Can take longer with large datasets

---

## Performance Tips

1. **Typeahead**: Use for instant user feedback (< 50ms)
2. **Combined Search**: Best for complex queries (100-300ms)
3. **Semantic Only**: Best when you want pure semantic matching
4. **Batch Size**: Keep between 10-20 for reindexing to avoid timeouts
5. **Incremental Reindex**: Run daily with "Changed Only" mode
6. **Full Reindex**: Only when embedding model changes

---

## Cost Optimization

**Upstash Vector:**
- Free tier: 10,000 queries/day
- Storage: ~$0.25/GB/month
- For 1,000 destinations: ~$0.05/month

**Upstash QStash:**
- Free tier: 500 messages/day
- Sufficient for scheduled jobs

**OpenAI Embeddings:**
- text-embedding-3-small: $0.00002/1K tokens
- 1,000 destinations: ~$0.02/month

**Total estimated cost:** < $1/month for typical usage

---

## Monitoring

Check logs for:
- `Supabase error:` - Database issues
- `Vector search failed` - Embedding or Upstash issues
- `Workflow error:` - Pipeline failures

Monitor in Vercel:
- Deployments → Logs
- Search for error keywords
- Check function duration

---

## Rollback

If issues arise:

1. **Disable QStash jobs:**
   - Go to Upstash QStash console
   - Pause or delete schedules

2. **Revert to keyword search:**
   - Use `/api/search/suggest` instead of `/api/search/combined`
   - Frontend gracefully falls back

3. **Clear vector index:**
   ```bash
   # Contact support or manually delete vectors
   ```

4. **Database rollback:**
   ```sql
   ALTER TABLE destinations DROP COLUMN last_indexed_at;
   ```
