# Post-Migration 025 Steps

## ✅ Migration 025 Complete

Migration 025 has successfully:
- Updated `embedding` column from `vector(768)` to `vector(3072)`
- Updated `search_destinations_intelligent` function to use `vector(3072)`
- Recreated the vector index

## ⚠️ Important: Regenerate Embeddings

**Since migration 025 dropped and recreated the embedding column, all existing embeddings were lost. You need to regenerate them.**

### Step 1: Verify Environment Variables

Make sure you have these set in `.env.local`:

```bash
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Run Backfill Script

Run the backfill script to generate embeddings for all destinations:

```bash
npm run backfill-embeddings
```

This will:
- Process destinations in batches of 50
- Generate 3072-dimension embeddings using OpenAI `text-embedding-3-large`
- Update the `destinations.embedding` column
- Rate limit to 25ms between requests (to avoid API limits)
- Skip destinations that already have embeddings (though all should be NULL after migration 025)

**Expected time:** Depends on number of destinations (~25ms per destination)

### Step 3: Verify Embeddings Were Generated

After the script completes, verify embeddings exist:

```sql
-- Check how many destinations have embeddings
SELECT COUNT(*) FROM destinations WHERE embedding IS NOT NULL;

-- Check total destinations
SELECT COUNT(*) FROM destinations;

-- Should match (or be close if some failed)
```

### Step 4: Test Search

Test that the intelligent search is working:

```sql
-- Test search function (replace with a real embedding or use a test query)
SELECT * FROM search_destinations_intelligent(
  query_embedding := (SELECT embedding FROM destinations WHERE embedding IS NOT NULL LIMIT 1),
  limit_count := 10
);
```

Or test via the API:
- Search from the homepage search bar
- Check `/api/search/intelligent` endpoint
- Verify results are returned correctly

## 🔍 Troubleshooting

### Script fails with "Missing Supabase environment variables"
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`

### Script fails with OpenAI API errors
- Check your `OPENAI_API_KEY` is valid
- Verify you have API credits available
- The script includes rate limiting (25ms delay), but if you hit limits, wait and retry

### Some destinations fail to update
- Check the error messages in the console
- Failed destinations will be skipped (errors count will be shown)
- You can re-run the script - it will only process destinations with NULL embeddings

### Search still returns dimension errors
- Verify migration 025 ran successfully
- Check that `search_destinations_intelligent` function signature uses `vector(3072)`
- Ensure embeddings are actually 1536 dimensions (check a sample destination)

## 📊 Next Steps After Embeddings

Once embeddings are generated:

1. **Test Search Intelligence** - Try various search queries on the homepage
2. **Monitor Performance** - Vector search should be fast with the index
3. **Consider Optimization** - Once embeddings are stable, you can adjust the IVFFlat index `lists` parameter if needed

## 📝 Notes

- The backfill script processes destinations where `embedding IS NULL`
- After migration 025, all embeddings should be NULL, so it will process all destinations
- If you need to regenerate embeddings for specific destinations, you can manually set their `embedding` to NULL and re-run the script

