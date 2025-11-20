# Sanity Webhook Setup Guide

Quick guide to set up automatic bidirectional sync between Sanity and Supabase.

## Prerequisites

✅ Your application is deployed (webhook needs a public URL)  
✅ Environment variables are configured  
✅ Initial sync from Supabase to Sanity is complete

## Step-by-Step Setup

### 1. Get Your Webhook URL

Your webhook endpoint is:
```
https://your-domain.com/api/sanity-webhook
```

For local testing, use a tunneling service:
```bash
# Install ngrok
npm install -g ngrok

# Start your dev server
npm run dev

# In another terminal, create tunnel
ngrok http 3000

# Use the ngrok URL: https://your-ngrok-url.ngrok.io/api/sanity-webhook
```

### 2. Generate Webhook Secret (Optional but Recommended)

```bash
# Generate a secure random secret
openssl rand -hex 32

# Add to your .env.local
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
   URL: https://your-domain.com/api/sanity-webhook
   Dataset: production
   Trigger on:
     ☑ Document created
     ☑ Document updated
     ☐ Document deleted (optional)
   Filter: _type == "destination"
   HTTP method: POST
   API version: v2023-10-01 (or latest)
   Secret: [paste your SANITY_WEBHOOK_SECRET if configured]
   ```

4. **Save the webhook**

### 4. Test the Webhook

1. **Make a test change in Sanity Studio**
   - Go to `/studio`
   - Edit a destination's description
   - Save the changes

2. **Check webhook delivery**
   - Go back to Sanity Manage → API → Webhooks
   - Click on your webhook
   - Check "Recent deliveries" tab
   - Should show successful delivery (200 status)

3. **Verify in Supabase**
   - Check your Supabase `destinations` table
   - The `description` field should be updated
   - `updated_at` should reflect the change time

### 5. Monitor Webhook Activity

**In Sanity:**
- Webhook dashboard shows delivery status
- Failed deliveries are retried automatically
- Check logs for any errors

**In Your Application:**
- Check server logs for webhook requests
- Look for `[Sanity Webhook]` log messages
- Monitor for any sync errors

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
- ✅ Webhook URL is correct and accessible
- ✅ Filter matches your document type (`_type == "destination"`)
- ✅ Trigger events are enabled (created, updated)
- ✅ Webhook is enabled (not paused)

**Test webhook endpoint:**
```bash
curl https://your-domain.com/api/sanity-webhook
# Should return: {"message":"Sanity webhook endpoint is active",...}
```

### Webhook Receiving but Not Syncing

**Check application logs for:**
- Missing Supabase credentials
- Missing Sanity credentials
- Document mapping errors
- Database constraint violations

**Common issues:**
- Slug mismatch between Sanity and Supabase
- Missing required fields in Supabase
- Database permissions issues

### Signature Verification Failing

If you set `SANITY_WEBHOOK_SECRET`:
- Ensure the secret in Sanity webhook config matches your env variable
- Secret must be exactly the same in both places
- Check for extra spaces or encoding issues

### Rate Limiting

Sanity webhooks have rate limits based on your plan:
- **Free tier**: Limited requests
- **Team/Enterprise**: Higher limits

If you hit limits:
- Reduce webhook frequency
- Use manual sync script for bulk updates
- Consider upgrading your Sanity plan

## Security Best Practices

1. **Use Webhook Secret**
   - Always set `SANITY_WEBHOOK_SECRET`
   - Verify signatures in production
   - Rotate secrets periodically

2. **Restrict Webhook Access**
   - Use environment-specific webhooks
   - Don't expose webhook URL publicly
   - Monitor for unauthorized access

3. **Validate Data**
   - Webhook validates document structure
   - Only processes `destination` type documents
   - Skips invalid or malformed documents

## Advanced Configuration

### Filter Specific Fields

Only sync when specific fields change:
```
Filter: _type == "destination" && defined(description)
```

### Multiple Webhooks

Set up separate webhooks for:
- Production dataset → Production Supabase
- Development dataset → Development Supabase

### Webhook Retry Logic

Sanity automatically retries failed webhooks:
- Immediate retry for 5xx errors
- Exponential backoff for persistent failures
- Manual retry available in webhook dashboard

## Next Steps

After webhook is set up:
1. ✅ Test with a few document changes
2. ✅ Monitor webhook delivery status
3. ✅ Verify data syncs correctly
4. ✅ Set up alerts for webhook failures (optional)

Your bidirectional sync is now active! 🎉

