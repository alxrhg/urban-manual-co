# Sanity Webhook Setup Guide

Complete guide to set up automatic sync between Sanity CMS and Supabase with draft/publish workflow, conflict detection, and audit logging.

## Features

- **Draft/Publish Workflow**: Only published content syncs to production
- **Conflict Detection**: Identifies when both systems are edited simultaneously
- **Audit Logging**: Full history of all content changes
- **Expanded Schema**: 40+ fields mapped between Sanity and Supabase
- **Bi-directional Mapping**: Editorial fields sync from Sanity, enrichment fields sync from Supabase

## Prerequisites

- ✅ Application deployed (webhook needs a public URL)
- ✅ Environment variables configured
- ✅ Initial sync from Supabase to Sanity complete
- ✅ Audit log migration applied (`438_content_audit_log.sql`)

## Environment Variables

Add these to your `.env.local` and production environment:

```bash
# Required for webhook
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Required for fetching documents
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_READ_TOKEN=your-api-token

# Recommended for security
SANITY_WEBHOOK_SECRET=your-secret-here  # Generate with: openssl rand -hex 32
```

## Step-by-Step Setup

### 1. Get Your Webhook URL

**Production:**
```
https://www.urbanmanual.co/api/sanity-webhook
```

**Local Testing (with ngrok):**
```bash
# Install ngrok
npm install -g ngrok

# Start dev server
npm run dev

# Create tunnel (in another terminal)
ngrok http 3000

# Use: https://your-ngrok-url.ngrok.io/api/sanity-webhook
```

### 2. Generate Webhook Secret

```bash
# Generate secure random secret
openssl rand -hex 32

# Add to .env.local
SANITY_WEBHOOK_SECRET=your-generated-secret-here
```

### 3. Configure Webhook in Sanity

1. **Go to Sanity Manage**
   - Visit: https://www.sanity.io/manage
   - Select your project

2. **Navigate to Webhooks**
   - Click **API** in the left sidebar
   - Click **Webhooks** tab
   - Click **Create webhook**

3. **Configure Webhook**
   ```
   Name: Sync to Supabase
   URL: https://www.urbanmanual.co/api/sanity-webhook
   Dataset: production

   Trigger on:
     ☑ Document created
     ☑ Document updated
     ☐ Document deleted (optional)

   Filter: _type == "destination"

   HTTP method: POST
   API version: v2023-10-01

   Secret: [paste your SANITY_WEBHOOK_SECRET]
   ```

4. **Save the webhook**

### 4. Apply Audit Log Migration

```bash
# Run the migration in Supabase
npx supabase db push

# Or apply manually in Supabase SQL editor:
# Copy contents of supabase/migrations/438_content_audit_log.sql
```

### 5. Test the Webhook

**Verify endpoint is active:**
```bash
curl https://www.urbanmanual.co/api/sanity-webhook
```

Expected response:
```json
{
  "status": "active",
  "message": "Sanity webhook endpoint is ready",
  "configuration": {
    "signatureVerification": true,
    "supabaseConfigured": true,
    "sanityConfigured": true
  },
  "features": [
    "Draft/publish workflow support",
    "Conflict detection",
    "Audit logging",
    "Expanded field mapping (40+ fields)"
  ]
}
```

**Test a change:**
1. Go to `/studio`
2. Edit a destination
3. Set status to "Published"
4. Save changes
5. Check Sanity Manage → Webhooks → Recent deliveries
6. Verify data in Supabase

## Publishing Workflow

### Content Statuses

| Status | Syncs to Supabase | Visible on Site |
|--------|-------------------|-----------------|
| Draft | ❌ No | ❌ No |
| In Review | ❌ No | ❌ No |
| Published | ✅ Yes | ✅ Yes |
| Scheduled | ❌ No (until scheduled time) | ❌ No |
| Archived | ❌ No | ❌ No |

### Workflow Steps

1. **Create/Edit in Sanity Studio**
   - Status defaults to "Draft"
   - Make your changes
   - Content stays in Sanity only

2. **Review (Optional)**
   - Set status to "In Review"
   - Have team member approve

3. **Publish**
   - Set status to "Published"
   - Webhook triggers automatically
   - Content syncs to Supabase
   - Changes appear on site immediately

4. **Schedule (Optional)**
   - Set status to "Scheduled"
   - Set "Scheduled For" date/time
   - Cron job publishes at scheduled time

## Field Mapping

### Editorial Fields (Sanity → Supabase)

These fields are edited in Sanity and sync to Supabase:

| Sanity Field | Supabase Column |
|--------------|-----------------|
| `name` | `name` |
| `slug` | `slug` |
| `category` | `category` |
| `microDescription` | `micro_description` |
| `description` | `description` |
| `city` | `city` |
| `country` | `country` |
| `neighborhood` | `neighborhood` |
| `geopoint.lat/lng` | `latitude`/`longitude` |
| `michelinStars` | `michelin_stars` |
| `rating` | `rating` |
| `priceLevel` | `price_level` |
| `architect` | `architect` |
| `website` | `website` |
| `tags` | `tags` |
| `crown` | `crown` |
| ...and more | |

### Enrichment Fields (Supabase → Sanity)

These fields are read-only in Sanity, populated from Supabase:

| Supabase Column | Sanity Field |
|-----------------|--------------|
| `place_id` | `placeId` |
| `user_ratings_total` | `userRatingsTotal` |
| `opening_hours_json` | `openingHours` |
| `views_count` | `viewsCount` |
| `saves_count` | `savesCount` |
| `last_enriched_at` | `lastEnrichedAt` |

## Conflict Detection

When both Sanity and Supabase are edited within 5 minutes, the webhook detects a conflict:

1. **Conflict is logged** to `content_audit_log` table
2. **Sanity wins** (editorial source of truth)
3. **Review conflicts** in admin dashboard or SQL:

```sql
-- View recent conflicts
SELECT * FROM get_recent_conflicts(24, 100);

-- View history for a destination
SELECT * FROM get_destination_history('destination-slug', 50);
```

## Audit Log

All changes are logged to `content_audit_log`:

```sql
-- View recent changes
SELECT * FROM content_audit_log
ORDER BY created_at DESC
LIMIT 100;

-- View changes by action
SELECT * FROM content_audit_log
WHERE action = 'update'
ORDER BY created_at DESC;
```

### Log Actions

| Action | Description |
|--------|-------------|
| `create` | New destination created in Supabase |
| `update` | Destination updated |
| `delete` | Destination deleted |
| `unpublish` | Status changed from published |
| `conflict` | Conflict detected during sync |

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
- ✅ Webhook URL is correct and accessible
- ✅ Filter matches document type (`_type == "destination"`)
- ✅ Trigger events enabled (created, updated)
- ✅ Webhook is not paused

**Test endpoint:**
```bash
curl https://www.urbanmanual.co/api/sanity-webhook
```

### Webhook Receiving but Not Syncing

**Check application logs for:**
- `[Sanity Webhook]` messages
- Missing credentials errors
- Document status (must be "published")

**Common issues:**
- Status is "draft" - change to "published"
- Missing required fields
- Slug mismatch

### Signature Verification Failing

- Ensure secret in Sanity matches `SANITY_WEBHOOK_SECRET`
- Check for extra spaces
- Regenerate secret if needed

### Content Not Appearing on Site

1. Check status is "Published"
2. Check webhook delivery in Sanity Manage
3. Verify data in Supabase
4. Check for cached data (may need to wait for revalidation)

## Security Best Practices

1. **Use Webhook Secret** - Always set `SANITY_WEBHOOK_SECRET`
2. **Rotate Secrets** - Change periodically
3. **Monitor Logs** - Check audit log for unusual activity
4. **Restrict Access** - Only admins should access audit logs

## Files Reference

| File | Purpose |
|------|---------|
| `sanity/schemas/destination.ts` | Expanded Sanity schema (40+ fields) |
| `lib/sanity/field-mapping.ts` | Bi-directional field mapping |
| `app/api/sanity-webhook/route.ts` | Webhook endpoint |
| `supabase/migrations/438_content_audit_log.sql` | Audit log table |

## Related Commands

```bash
# Manual sync (Supabase → Sanity)
npm run sanity:sync

# Reverse sync (Sanity → Supabase)
npm run sanity:sync:reverse

# Check sync status
curl https://www.urbanmanual.co/api/sanity-webhook
```

## Next Steps

After webhook is set up:

1. ✅ Test with a few document changes
2. ✅ Verify draft → published workflow
3. ✅ Monitor webhook delivery status
4. ✅ Check audit logs are being created
5. ✅ Set up alerts for webhook failures (optional)

Your CMS sync is now active with full publishing workflow! 🎉
