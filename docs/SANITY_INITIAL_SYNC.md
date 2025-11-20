# Sanity Initial Sync Guide

If your Sanity Studio is empty, you need to sync data from Supabase first.

## Quick Setup

### Step 1: Get Your Sanity Credentials

You need these from your Sanity project:

1. **Project ID**: Found in Sanity Manage → Your Project → Settings → Project ID
2. **Dataset**: Usually `production` (or check in Sanity Studio)
3. **API Token**: 
   - Go to Sanity Manage → Your Project → API → Tokens
   - Create a new token with **Editor** permissions
   - Copy the token

### Step 2: Add to Local Environment

Add these to your `.env.local` file:

```bash
# Sanity Configuration
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id-here
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2023-10-01
SANITY_TOKEN=your-editor-token-here
SANITY_API_WRITE_TOKEN=your-editor-token-here  # Same as SANITY_TOKEN
```

**Or get from Vercel:**
1. Go to your Vercel project → Settings → Environment Variables
2. Copy the Sanity variables to your `.env.local`

### Step 3: Run Initial Sync

```bash
# Preview what will be synced (recommended first)
npm run sanity:sync -- --dry-run --limit=10

# Sync first 10 destinations (test)
npm run sanity:sync -- --limit=10

# Sync all destinations
npm run sanity:sync
```

### Step 4: Verify in Sanity Studio

1. Start your dev server: `npm run dev`
2. Go to http://localhost:3000/studio
3. You should see your destinations!

## Troubleshooting

### "Missing Sanity project ID"
- Make sure `NEXT_PUBLIC_SANITY_PROJECT_ID` is in `.env.local`
- Restart your terminal/dev server after adding variables

### "Unauthorized" errors
- Check that `SANITY_TOKEN` has **Editor** permissions
- Token must have write access to create/update documents

### "No destinations found"
- Verify Supabase credentials are set
- Check that you have destinations in your Supabase `destinations` table

### Sync is slow
- The script processes in batches of 10
- For large datasets, this is normal
- You can monitor progress in the terminal

## Next Steps

After initial sync:
1. ✅ Verify data appears in Sanity Studio
2. ✅ Set up webhook for automatic sync (see `docs/SANITY_WEBHOOK_SETUP.md`)
3. ✅ Start editing content in Sanity Studio

