# Cloudflare AutoRAG Setup Guide

## Prerequisites

✅ You already have:
- R2 Paid subscription active
- Supabase with destination data
- Next.js app ready for integration

## Step 1: Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) → R2 → Create bucket
2. Name it: `urban-manual-destinations` (or your preferred name)
3. Note: Buckets are created instantly and ready to use

## Step 2: Create R2 API Token

1. Go to Cloudflare Dashboard → R2 → Manage R2 API Tokens
2. Click "Create API Token"
3. Permissions:
   - Object Read & Write
   - Bucket: `urban-manual-destinations` (or your bucket name)
4. Copy the credentials:
   - Access Key ID
   - Secret Access Key

## Step 3: Set Environment Variables

Add these to your `.env.local`:

```env
# Cloudflare R2 (for data export)
CLOUDFLARE_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=urban-manual-destinations

# Cloudflare AutoRAG (for queries)
CLOUDFLARE_API_TOKEN=your_api_token
AUTORAG_INSTANCE_ID=your_instance_id (will be created in Step 5)
```

**How to get Account ID:**
- Go to Cloudflare Dashboard → Right sidebar → Account ID

**How to get API Token:**
- Go to Cloudflare Dashboard → My Profile → API Tokens
- Create token with permissions: `Account:AI:Edit`

## Step 4: Export Destination Data to R2

Run the export script:

```bash
# Test with dry run first
npx tsx scripts/export-destinations-to-r2.ts --dry-run

# Export first 100 destinations (for testing)
npx tsx scripts/export-destinations-to-r2.ts --limit=100

# Export all destinations
npx tsx scripts/export-destinations-to-r2.ts
```

**What it does:**
- Fetches destinations from Supabase
- Converts each destination to Markdown format
- Uploads to R2 bucket as `destinations/{slug}.md`
- AutoRAG will automatically index these files

**Expected output:**
```
🚀 Starting destination export to R2...
📦 Bucket: urban-manual-destinations
✅ Found 500 destinations
✅ Uploaded: destinations/restaurant-name.md
...
📊 Export Summary:
   ✅ Success: 500
   ❌ Errors: 0
```

## Step 5: Create AutoRAG Instance

1. Go to Cloudflare Dashboard → AI → AutoRAG
2. Click "Create AutoRAG Instance"
3. Configure:
   - **Name**: `urban-manual-destinations`
   - **Data Source**: R2 Bucket
   - **Bucket**: `urban-manual-destinations`
   - **Path Prefix**: `destinations/` (optional, if all files are in this folder)
   - **Chunk Size**: 512-1024 tokens (default is fine)
   - **Query Rewriting**: Enabled (recommended)
4. Click "Create"

**Note**: AutoRAG will start indexing automatically. This may take a few minutes depending on the number of files.

5. Copy the **Instance ID** from the instance details page
6. Add it to `.env.local`:
   ```env
   AUTORAG_INSTANCE_ID=your_instance_id_here
   ```

## Step 6: Test AutoRAG Integration

### Test via API:

```bash
curl -X POST http://localhost:3000/api/concierge/autorag \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the best restaurants in Paris?",
    "max_results": 5
  }'
```

### Test in Code:

```typescript
import { queryAutoRAG } from '@/lib/cloudflare/autorag';

const response = await queryAutoRAG('Tell me about the best restaurants in Paris', {
  max_results: 10,
  rewrite_query: true,
});

console.log(response.results);
```

## Step 7: Integrate into Your App

### Option 1: Use in Concierge API

Update `app/api/concierge/query/route.ts` to use AutoRAG for conversational queries:

```typescript
import { queryAutoRAG } from '@/lib/cloudflare/autorag';

// For conversational queries, use AutoRAG
if (isConversationalQuery(query)) {
  const autoragResponse = await queryAutoRAG(query);
  return Response.json({
    explanation: autoragResponse.results[0]?.content,
    // ... other fields
  });
}
```

### Option 2: Create Dedicated AutoRAG Endpoint

Already created at `/api/concierge/autorag` - use it directly!

```typescript
const response = await fetch('/api/concierge/autorag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What are the best restaurants in Paris?',
    max_results: 10,
  }),
});

const data = await response.json();
console.log(data.answer); // Combined answer from AutoRAG
```

## Step 8: Monitor and Update

### Check AutoRAG Status:
- Go to Cloudflare Dashboard → AI → AutoRAG
- View indexing progress
- Check query logs

### Update Data:
When you add new destinations or update existing ones:

```bash
# Re-export updated destinations
npx tsx scripts/export-destinations-to-r2.ts

# AutoRAG will automatically detect new/updated files and re-index
```

## Troubleshooting

### Export Script Errors:

**Error: Missing R2 configuration**
- Make sure all R2 environment variables are set
- Verify R2 API token has correct permissions

**Error: Failed to upload to R2**
- Check bucket name matches `R2_BUCKET_NAME`
- Verify R2 credentials are correct
- Check bucket exists in Cloudflare Dashboard

### AutoRAG Query Errors:

**Error: Missing AutoRAG configuration**
- Verify `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `AUTORAG_INSTANCE_ID` are set
- Check API token has `Account:AI:Edit` permission

**Error: Instance not found**
- Verify `AUTORAG_INSTANCE_ID` matches the instance ID in Cloudflare Dashboard
- Make sure the instance is created and active

**No results returned**
- Check if data has been uploaded to R2
- Verify AutoRAG has finished indexing (check dashboard)
- Try a simpler query first

## Best Practices

1. **Incremental Updates**: Only export changed destinations to save time
2. **Query Optimization**: Use `rewrite_query: true` for better results
3. **Result Filtering**: Set `min_score` to filter low-quality results
4. **Hybrid Approach**: Use Supabase for structured queries, AutoRAG for conversational
5. **Monitoring**: Check AutoRAG dashboard regularly for indexing status

## Cost Considerations

- **R2 Storage**: $0.015/GB/month (you have 10GB free)
- **R2 Operations**: 1M Class A ops free, then $4.50/million
- **AutoRAG**: Free during open beta
- **Workers AI**: Pay-as-you-go for inference (used by AutoRAG)

**Estimated costs for 1000 destinations:**
- Storage: ~50MB = $0.00075/month (well within free tier)
- Operations: Minimal (only on export) = Free
- AutoRAG: Free (beta)
- Workers AI: ~$0.01-0.05 per 1000 queries

## Next Steps

1. ✅ Export destination data to R2
2. ✅ Create AutoRAG instance
3. ✅ Test queries
4. ✅ Integrate into your concierge/chat features
5. ✅ Monitor performance and costs

## Resources

- [Cloudflare AutoRAG Docs](https://developers.cloudflare.com/autorag/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [AutoRAG API Reference](https://developers.cloudflare.com/api/operations/ai-autorag-query)

