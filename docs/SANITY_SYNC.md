# Sanity CMS Sync Guide

This guide explains how to sync data between Supabase and Sanity CMS with **bidirectional sync** support.

## Overview

- **Source of Truth**: Supabase `destinations` table (primary)
- **Content Editor**: Sanity CMS `destination` documents
- **Sync Direction**: 
  - **Supabase → Sanity**: Manual sync script (initial migration)
  - **Sanity → Supabase**: Automatic via webhooks (real-time) OR manual sync script
- **Purpose**: Enable rich content editing in Sanity Studio while keeping Supabase as the primary data store

## Quick Start

### Initial Sync (Supabase → Sanity)

```bash
# Preview what will be synced (dry run)
npm run sanity:sync -- --dry-run

# Sync all destinations from Supabase to Sanity
npm run sanity:sync

# Sync specific destination
npm run sanity:sync -- --slug=hellbender

# Sync first 10 destinations (for testing)
npm run sanity:sync -- --limit=10
```

### Reverse Sync (Sanity → Supabase)

```bash
# Preview changes (dry run)
npm run sanity:sync:reverse -- --dry-run

# Sync all destinations from Sanity to Supabase
npm run sanity:sync:reverse

# Sync specific destination
npm run sanity:sync:reverse -- --slug=hellbender

# Sync first 10 (for testing)
npm run sanity:sync:reverse -- --limit=10
```

## How It Works

### 1. **Data Mapping**

The sync script maps Supabase fields to Sanity document format:

| Supabase Field | Sanity Field | Notes |
|---------------|--------------|-------|
| `slug` | `slug.current` | Used as document ID |
| `name` | `name` | Direct mapping |
| `city` | `city` | Direct mapping |
| `country` | `country` | Direct mapping |
| `description` | `description` | Converted to Portable Text blocks |
| `category` | `categories` | Converted to array |
| `image` / `main_image` | `heroImage` | Requires manual upload (see below) |
| - | `lastSyncedAt` | Timestamp of last sync |

### 2. **Image Handling**

Sanity requires images to be uploaded to its asset system. The sync script currently:
- Skips image uploads (you'll need to upload manually in Studio)
- Stores image URLs in Supabase for reference

**To upload images to Sanity:**
1. Use Sanity's asset upload API
2. Or manually upload images in Studio after sync
3. Or extend the script to use Sanity's asset upload feature

### 3. **Incremental Sync**

The script:
- Checks if a document exists by slug
- Creates new documents if they don't exist
- Updates existing documents if they do
- Uses slug as the unique identifier

## Sync Scripts

### `sync-supabase-to-sanity.ts`

Main sync script that:
1. Fetches destinations from Supabase
2. Maps them to Sanity format
3. Creates/updates documents in Sanity
4. Provides detailed progress and error reporting

**Options:**
- `--dry-run`: Preview changes without applying
- `--limit=N`: Sync only first N destinations
- `--slug=name`: Sync specific destination by slug

## Workflow Recommendations

### Recommended: Bidirectional Sync with Webhooks

1. **Initial Setup**: Run `npm run sanity:sync` to populate Sanity from Supabase
2. **Configure Webhook**: Set up Sanity webhook pointing to `/api/sanity-webhook`
3. **Edit in Sanity Studio**: Make content changes (rich text, images, etc.)
4. **Automatic Sync**: Webhook automatically updates Supabase in real-time
5. **Edit in Supabase**: Changes in Supabase can be synced to Sanity manually when needed

### Alternative: Manual Sync Workflow

1. **Edit in Supabase** (via admin UI or direct DB access)
2. **Sync to Sanity**: Run `npm run sanity:sync` when you want to use Sanity Studio
3. **Edit in Sanity Studio** for rich text content
4. **Sync back to Supabase**: Run `npm run sanity:sync:reverse` to update Supabase

### Content Editing Workflow

**For Rich Text Content:**
- Use Sanity Studio (better editing experience)
- Changes sync automatically via webhook
- Or sync manually with reverse sync script

**For Structured Data:**
- Edit directly in Supabase (faster for bulk updates)
- Sync to Sanity when you need to edit rich content

## Bidirectional Sync Setup

### Option 1: Automatic Webhook Sync (Recommended) ⚡

**Real-time bidirectional sync** - Changes in Sanity automatically update Supabase.

#### Step 1: Deploy Your Application

Ensure your application is deployed and the webhook endpoint is accessible:
- Production: `https://your-domain.com/api/sanity-webhook`
- Development: Use a tunneling service like ngrok for local testing

#### Step 2: Configure Sanity Webhook

1. Go to [Sanity Manage](https://www.sanity.io/manage)
2. Select your project
3. Navigate to **API** → **Webhooks**
4. Click **Create webhook**
5. Configure:
   - **Name**: "Sync to Supabase"
   - **URL**: `https://your-domain.com/api/sanity-webhook`
   - **Dataset**: `production` (or your dataset name)
   - **Trigger on**: 
     - ✅ Document created
     - ✅ Document updated
     - ✅ Document deleted (optional)
   - **Filter**: `_type == "destination"`
   - **HTTP method**: `POST`
   - **API version**: `v2021-06-07` or later
   - **Secret** (optional): Set `SANITY_WEBHOOK_SECRET` in your environment

6. Click **Save**

#### Step 3: Set Environment Variable (Optional but Recommended)

Add webhook secret for security:

```bash
SANITY_WEBHOOK_SECRET=your-random-secret-string
```

Generate a secret:
```bash
openssl rand -hex 32
```

#### Step 4: Test the Webhook

1. Make a change to a destination in Sanity Studio
2. Check your application logs to see the webhook being received
3. Verify the change appears in Supabase

**Webhook Endpoint**: `/api/sanity-webhook`
- Automatically receives Sanity document changes
- Maps Sanity format to Supabase format
- Updates Supabase destinations table
- Handles both creates and updates

### Option 2: Manual Reverse Sync Script

For one-time or scheduled syncing from Sanity to Supabase:

```bash
# Sync all changes from Sanity to Supabase
npm run sanity:sync:reverse
```

Use this when:
- Webhooks are not configured
- You want to sync on a schedule (via cron)
- You need to do bulk updates

### Option 3: Scheduled Polling

Set up a cron job to periodically sync:

```typescript
// app/api/cron/sync-sanity/route.ts
export async function GET(request: NextRequest) {
  // Verify cron secret
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Run reverse sync
  // ... call sync logic
}
```

Then configure in Vercel Cron or similar:
```json
{
  "crons": [{
    "path": "/api/cron/sync-sanity",
    "schedule": "0 */6 * * *"  // Every 6 hours
  }]
}
```

## Environment Variables

Required for sync:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Required for webhook and scripts

# Sanity
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_WRITE_TOKEN=your-write-token  # Required for creating/updating
SANITY_API_READ_TOKEN=your-read-token   # Required for reverse sync

# Webhook Security (Optional but Recommended)
SANITY_WEBHOOK_SECRET=your-random-secret-string  # For webhook signature verification
```

## Troubleshooting

### "Missing Sanity project ID"
- Ensure `NEXT_PUBLIC_SANITY_PROJECT_ID` is set
- Or set `SANITY_STUDIO_PROJECT_ID` or `SANITY_API_PROJECT_ID`

### "Unauthorized" errors
- Check that `SANITY_API_WRITE_TOKEN` has write permissions
- Token must have `editor` or `admin` role

### Images not syncing
- Images require manual upload to Sanity's asset system
- The script skips image uploads by design
- Upload images manually in Studio or extend the script

### Rate limiting
- Script processes in batches of 10 with 500ms delays
- Adjust batch size if you hit rate limits
- Sanity has rate limits based on your plan

## Sync Status

✅ **Implemented:**
- [x] Supabase → Sanity sync script
- [x] Sanity → Supabase sync script  
- [x] Automatic webhook endpoint for real-time sync
- [x] Portable Text to plain text conversion
- [x] Batch processing with rate limiting
- [x] Dry-run mode for previewing changes
- [x] Error handling and detailed reporting

🔄 **Future Enhancements:**
- [ ] Automatic image upload to Sanity assets
- [ ] Conflict resolution for concurrent edits
- [ ] Field-level sync (only sync changed fields)
- [ ] Sync status tracking in database
- [ ] Webhook retry logic for failed syncs
- [ ] Sync history/audit log

