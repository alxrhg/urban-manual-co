# Google Discovery Engine Setup Guide

## ⚠️ Important: Discovery Engine is OPTIONAL

**Discovery Engine is a premium feature that is NOT required for the application to work.**

- ✅ **App works perfectly without it** - Uses standard Supabase search
- ✅ **503 status is expected** - When not configured, `/api/search/discovery` returns `503` with `{fallback: true}`
- ✅ **No errors** - This is intentional fallback behavior, not a bug
- ✅ **Frontend should handle gracefully** - Check for `fallback: true` and use standard search

## Why Use Discovery Engine?

Discovery Engine provides advanced AI-powered search features:
- **Semantic search** - Understands user intent, not just keywords
- **Personalization** - Tailored results based on user behavior
- **Smart ranking** - Uses ML to rank results by relevance
- **Auto-complete** - Intelligent search suggestions
- **Spell correction** - Handles typos automatically

**Cost:** ~$0.50 per 1,000 queries (see [pricing](https://cloud.google.com/discovery-engine/pricing))

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **Discovery Engine API** enabled in your project
3. **Service Account** with Discovery Engine permissions
4. **Data Store** created in Discovery Engine console

## Step 1: Google Cloud Setup

### 1.1 Create or Select a Google Cloud Project

```bash
# Using gcloud CLI
gcloud projects create urban-manual-prod --name="Urban Manual Production"
gcloud config set project urban-manual-prod
```

Or use [Google Cloud Console](https://console.cloud.google.com/)

### 1.2 Enable Discovery Engine API

```bash
# Enable the API
gcloud services enable discoveryengine.googleapis.com
```

Or enable via [API Library](https://console.cloud.google.com/apis/library/discoveryengine.googleapis.com)

### 1.3 Create a Service Account

```bash
# Create service account
gcloud iam service-accounts create discovery-engine-sa \
    --display-name="Discovery Engine Service Account"

# Grant Discovery Engine Admin role
gcloud projects add-iam-policy-binding urban-manual-prod \
    --member="serviceAccount:discovery-engine-sa@urban-manual-prod.iam.gserviceaccount.com" \
    --role="roles/discoveryengine.admin"

# Create and download service account key
gcloud iam service-accounts keys create discovery-engine-key.json \
    --iam-account=discovery-engine-sa@urban-manual-prod.iam.gserviceaccount.com
```

**Security Note:** Keep `discovery-engine-key.json` secure. Never commit to version control.

### 1.4 Create a Data Store

**Option A: Using Google Cloud Console (Recommended)**

1. Go to [Discovery Engine Console](https://console.cloud.google.com/gen-app-builder)
2. Click **"Create App"** or **"Create Data Store"**
3. Configure:
   - **Name:** `urban-manual-destinations`
   - **Type:** Structured data or Generic
   - **Location:** Global (recommended)
   - **Import Source:** Cloud Storage (you can skip actual import - we'll use API)
4. Click **"Create"**
5. Note the **Data Store ID** from the URL or details page

**Option B: Using gcloud CLI**

```bash
# Create data store
gcloud alpha discovery-engine data-stores create urban-manual-destinations \
    --location=global \
    --collection=default_collection \
    --data-store-type=SOLUTION_TYPE_SEARCH
```

See [DATA_STORE_CREATION_GUIDE.md](./DATA_STORE_CREATION_GUIDE.md) for detailed instructions.

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env.local` (for local development) and Vercel (for production):

### Required Variables

```bash
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
DISCOVERY_ENGINE_DATA_STORE_ID=urban-manual-destinations
GOOGLE_CLOUD_LOCATION=global  # or your preferred location (e.g., us-central1)

# Service Account Credentials
# Option 1: Path to service account JSON file (local development)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Option 2: Service account JSON as environment variable (Vercel)
# Set GOOGLE_APPLICATION_CREDENTIALS_JSON as a single-line JSON string
```

### Vercel Configuration

For Vercel deployment, you have two options:

#### Option A: Service Account JSON File (Recommended)

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add `GOOGLE_CLOUD_PROJECT_ID` with your project ID
3. Add `DISCOVERY_ENGINE_DATA_STORE_ID` with your data store ID
4. Add `GOOGLE_CLOUD_LOCATION` with your location
5. For credentials, use Vercel's **Secret Files** feature or encode the JSON as a base64 string

#### Option B: Service Account JSON as Environment Variable

1. Convert your service account JSON to a single-line string
2. Add it as `GOOGLE_APPLICATION_CREDENTIALS_JSON` in Vercel
3. Update the service to parse this variable

### Local Development Setup

For local development, you can use the `gcloud` CLI:

```bash
# Install gcloud CLI (if not already installed)
# macOS: brew install google-cloud-sdk
# Linux: Follow instructions at https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth application-default login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

This will automatically configure credentials for local development.

## Step 3: Export Data from Supabase

Export all destinations from Supabase to prepare for import:

```bash
npm run discovery:export
```

This will create a `discovery-engine-export.json` file with all your destinations.

## Step 4: Import Data to Discovery Engine

Import the exported data into Discovery Engine:

```bash
npm run discovery:import
```

**Note**: This will prompt you to confirm before importing. Make sure you've:
- Set up your data store in Google Cloud Console
- Configured all environment variables
- Exported your data first

The import process will:
- Transform destinations to Discovery Engine document format
- Import in batches (100 at a time by default)
- Show progress and any errors

## Step 5: Verify Setup

### Test Search API

```bash
# Test search endpoint
curl -X POST http://localhost:3000/api/search/discovery \
  -H "Content-Type: application/json" \
  -d '{
    "query": "romantic restaurant",
    "city": "paris",
    "pageSize": 10
  }'
```

### Test Recommendations API

```bash
# Test recommendations endpoint (requires authentication)
curl http://localhost:3000/api/recommendations/discovery?userId=test-user-id&pageSize=5
```

### Test Event Tracking

```bash
# Track a view event
curl -X POST http://localhost:3000/api/discovery/track-event \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "eventType": "view",
    "documentId": "destination-slug"
  }'
```

## Step 6: Integration with Existing Search

The Discovery Engine integration is designed to work alongside your existing search:

1. **Feature Flag**: Use `USE_DISCOVERY_ENGINE` environment variable to toggle
2. **Fallback**: If Discovery Engine is not configured, the API will return a 503 error, allowing you to fall back to Supabase search
3. **Hybrid Approach**: You can use Discovery Engine for semantic search and enhance results with your custom ranking logic

### Example Integration

```typescript
// In your search component
const searchDestinations = async (query: string) => {
  try {
    // Try Discovery Engine first
    const response = await fetch('/api/search/discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.results;
    }
  } catch (error) {
    // Fallback to Supabase search
    return fallbackSearch(query);
  }
};
```

## Troubleshooting

### Error: "Discovery Engine is not configured"

- Check that `GOOGLE_CLOUD_PROJECT_ID` is set
- Check that `DISCOVERY_ENGINE_DATA_STORE_ID` is set
- Verify your service account credentials are configured

### Error: "Permission denied"

- Ensure your service account has `Discovery Engine API Admin` or `Discovery Engine API User` role
- Check that the Discovery Engine API is enabled in your project

### Error: "Data store not found"

- Verify the data store ID matches exactly (case-sensitive)
- Check that the data store exists in the correct location
- Ensure you're using the correct project ID

### Import Errors

- Check that your exported data is valid JSON
- Verify destination slugs/IDs are unique
- Check Google Cloud Console for detailed error messages
- Review the import script output for specific errors

### Authentication Issues

**Local Development**:
- Run `gcloud auth application-default login`
- Verify with `gcloud auth list`

**Vercel**:
- Ensure service account JSON is correctly set as environment variable
- Check that the JSON is valid and not corrupted
- Verify the service account has the correct permissions

## Cost Estimation

Discovery Engine pricing (as of 2025):
- **Free Tier**: First 1,000 queries/month
- **Search Queries**: ~$0.01-0.05 per query
- **Document Storage**: ~$0.10-0.50 per GB/month
- **User Events**: ~$0.001 per event

**Estimated Monthly Cost** (10,000 active users):
- Search queries: ~$2,000/month
- Storage: ~$0.30/month
- Events: ~$500/month
- **Total**: ~$2,500/month

**Cost Optimization**:
- Implement aggressive caching (reduce queries by 70-80%)
- Batch user events
- Monitor usage and set up billing alerts

## Next Steps

1. ✅ Set up Google Cloud project and enable Discovery Engine API
2. ✅ Create service account and data store
3. ✅ Configure environment variables
4. ✅ Export data from Supabase
5. ✅ Import data to Discovery Engine
6. ✅ Test search and recommendations APIs
7. ✅ Integrate with existing search UI
8. ✅ Set up event tracking for personalization
9. ✅ Monitor usage and costs
10. ✅ Optimize based on performance metrics

## Additional Resources

- [Discovery Engine Documentation](https://cloud.google.com/generative-ai-app-builder/docs)
- [Discovery Engine API Reference](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest)
- [Pricing Information](https://cloud.google.com/generative-ai-app-builder/pricing)
- [Best Practices Guide](https://cloud.google.com/generative-ai-app-builder/docs/best-practices)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Google Cloud Console logs
3. Check the Discovery Engine service status
4. Review the integration plan: `GOOGLE_DISCOVERY_ENGINE_INTEGRATION_PLAN.md`

