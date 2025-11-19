# Fix Supabase Configuration

## Quick Fix

Add these two lines to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-anon-key
```

## Where to Get These Values

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Sign in (or create free account)

2. **Select Your Project:**
   - If you don't have one, click "New Project"
   - Choose a name, database password, and region
   - Wait ~2 minutes for it to set up

3. **Get Your Credentials:**
   - Click on your project
   - Go to **Settings** (gear icon in sidebar)
   - Click **API** in the settings menu
   - You'll see:
     - **Project URL** → Copy this for `NEXT_PUBLIC_SUPABASE_URL`
     - **Project API keys** → Copy the `anon` `public` key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Example

Your `.env.local` should look like:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzI0NzYwMCwiZXhwIjoxOTM4ODIzNjAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# For server-side operations (optional, but recommended)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-service-role-key
```

## After Adding

1. **Save `.env.local`**
2. **Restart dev server** (should auto-restart)
3. **Refresh browser** - Supabase errors should be gone!

## What If I Don't Have Supabase?

If you don't want to use Supabase right now, you can use placeholder values to stop the errors:

```env
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
```

But features that need Supabase (saved places, user accounts, etc.) won't work.

## Current Issue

The app is trying to use Supabase but can't find valid credentials in `.env.local`, so it's using a placeholder client and logging errors.

---

**Quick Start:** Get free Supabase account at https://supabase.com/dashboard (takes 5 minutes)
