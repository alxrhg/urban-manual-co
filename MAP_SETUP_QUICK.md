# Quick Map Setup Guide

## Current Status
✅ Map now tries **Apple Maps first**, then falls back to **Mapbox**

## Option 1: Apple MapKit (Recommended - Best Quality)

**Cost:** $99/year Apple Developer membership
**Pros:** Beautiful maps, unlimited API calls, native iOS look
**Cons:** Requires paid Apple Developer account

### Setup Steps:
1. Go to https://developer.apple.com/account/
2. Create a MapKit JS key (see [docs/MAPKIT_SETUP.md](file:///Users/alxrhg/urban-manual-1/docs/MAPKIT_SETUP.md) for detailed steps)
3. Add to `.env.local`:
   ```env
   MAPKIT_TEAM_ID=your-team-id
   MAPKIT_KEY_ID=your-key-id
   MAPKIT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----
   your-private-key-here
   -----END PRIVATE KEY-----
   ```

## Option 2: Mapbox (Fallback - Free Tier Available)

**Cost:** Free up to 50k map loads/month
**Pros:** Free tier, easy setup, good performance
**Cons:** Not as polished as Apple Maps

### Setup Steps:
1. Go to https://account.mapbox.com/access-tokens/
2. Sign up (free)
3. Copy your default public token (starts with `pk.`)
4. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your-token-here
   ```

## Quick Start (Mapbox - Easiest)

Since you already have `.env.local` open, just add your Mapbox token:

1. Get token from: https://account.mapbox.com/access-tokens/
2. Add this line to `.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbHh4eHh4eHgifQ.xxxxxxxxxxxxxxxxxxxx
   ```
3. Restart dev server (Ctrl+C then `npm run dev`)
4. Refresh http://localhost:3000/map-demo

## How It Works

The map will:
1. ✅ Try to load Apple Maps (if credentials in `.env.local`)
2. ❌ If Apple fails → automatically fall back to Mapbox
3. ❌ If Mapbox fails → show error message

## Current Demo

Visit: http://localhost:3000/map-demo

You'll see:
- 🍽️ Restaurant (Narisawa - 2 Michelin stars)
- ☕ Cafe (Blue Bottle Coffee)
- 🏨 Hotel (Park Hyatt Tokyo)

All with interactive markers and popups!

---

**Recommendation:** Start with Mapbox (free, 5 min setup), upgrade to Apple Maps later if you want premium quality.
