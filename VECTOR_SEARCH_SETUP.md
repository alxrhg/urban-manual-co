# Vector Search Setup Guide

## ✅ Completed

1. **Migrations Created:**
   - `023_enable_vector_search.sql` - Enables pgvector extension and adds embedding columns
   - `024_hybrid_search_function.sql` - Creates hybrid search function with user context
   - `025_conversation_tables.sql` - Conversation tables (if not already exist)

2. **Utilities Created:**
   - `lib/embeddings/generate.ts` - Embedding generation utility
   - `scripts/backfill-embeddings.ts` - Backfill script for existing destinations

3. **Package Scripts:**
   - Added `backfill-embeddings` script to package.json

## 📋 Next Steps

### 1. Run Migrations in Supabase

Run these migrations in order in your Supabase SQL Editor:

```sql
-- 1. Enable vector search
-- Run: supabase/migrations/023_enable_vector_search.sql

-- 2. Create hybrid search function
-- Run: supabase/migrations/024_hybrid_search_function.sql

-- 3. Conversation tables (if needed)
-- Run: supabase/migrations/025_conversation_tables.sql
```

### 2. Set Environment Variables

Ensure these are set in your `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_EMBEDDING_MODEL=text-embedding-3-large  # Optional, defaults to this
```

### 3. Backfill Embeddings

Run the backfill script to generate embeddings for all existing destinations:

```bash
npm run backfill-embeddings
```

This will:
- Process destinations in batches of 50
- Generate embeddings using OpenAI `text-embedding-3-large`
- Update the `destinations.embedding` column
- Rate limit to 25ms between requests

### 4. Test Hybrid Search

Test the hybrid search function:

```sql
-- Example: Search for "cozy cafes in Tokyo"
SELECT * FROM search_destinations_hybrid(
  query_embedding := (SELECT embedding FROM destinations WHERE slug = 'sample-destination' LIMIT 1),
  city_filter := 'Tokyo',
  category_filter := 'cafe',
  limit_count := 10
);
```

## 🔧 Integration Points

### Current API Routes

The existing API routes can be enhanced to use vector search:

1. **`/api/ai-chat/route.ts`** - Already uses vector search via `match_destinations` RPC
2. **`/api/search/route.ts`** - Can be enhanced with hybrid search
3. **`/api/conversation/[user_id]/route.ts`** - Can use hybrid search for context-aware results

### Hybrid Search Function Features

The `search_destinations_hybrid` function provides:

- **Vector similarity** (50% weight) - Semantic match
- **Rating boost** (15% weight) - Higher rated places
- **Michelin boost** (10% weight) - Awarded places
- **Saved boost** (15% weight) - User's saved places (if `boost_saved = true`)
- **Visited boost** (10% weight) - User's visited places

### Filters Available

- `city_filter` - Filter by city name
- `category_filter` - Filter by category
- `michelin_only` - Only show Michelin-starred
- `price_max` - Maximum price level
- `rating_min` - Minimum rating
- `tags_filter` - Array of tags to match
- `include_saved_only` - Only return saved destinations
- `boost_saved` - Boost saved destinations in ranking

## 📊 Performance Considerations

- **IVFFlat Index**: Uses `lists = 100` for good performance on ~1000 destinations
- **Batch Processing**: Backfill processes 50 destinations at a time
- **Rate Limiting**: 25ms delay between embedding requests to avoid API limits

## 🚨 Notes

- The `embedding` column uses `vector(1536)` type (for text-embedding-3-large)
- Embeddings are generated once and stored - no need to regenerate unless destination content changes
- The hybrid search function requires embeddings to exist (`WHERE d.embedding IS NOT NULL`)

## 🔄 Future Enhancements

1. **Auto-update embeddings** when destination content changes
2. **Incremental backfill** for new destinations
3. **Embedding versioning** for model upgrades
4. **Caching** frequently searched embeddings

