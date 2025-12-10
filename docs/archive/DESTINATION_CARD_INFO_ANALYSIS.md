# Destination Card Info Analysis

## Currently Visible on Destination Cards

1. **Image** ✅
   - Thumbnail or full image
   - Fallback placeholder

2. **Name** ✅
   - Destination name (line-clamp-2)

3. **Micro Description** ✅
   - Short description or fallback: "Category in City"

4. **Badges** ✅
   - Michelin stars (if present)
   - ML Forecasting badges (if enabled)
   - Visited check badge (if visited)
   - Admin edit button (if admin)

## Available but NOT Visible

1. **Price Level** ❌
   - Field: `price_level?: number | null`
   - Google Places API: 0-4 scale (0 = free, 4 = very expensive)
   - Should show: $, $$, $$$, $$$$ or similar

2. **Rating** ❌
   - Field: `rating?: number | null`
   - Google Places API: 0-5 scale
   - Should show: Star rating (e.g., 4.5 ⭐)

3. **"Open Now" Status** ❌
   - Field: `opening_hours_json?: Record<string, unknown> | null`
   - Helper: `isOpenNow()` function exists in `lib/utils/opening-hours.ts`
   - Should show: "Open now" badge or indicator

## Recommendation

Add these three pieces of information to destination cards:
- **Price level**: Show as $, $$, $$$, $$$$ below the name or as a badge
- **Rating**: Show as stars (e.g., 4.5 ⭐) next to price or below name
- **Open now**: Show as a green "Open now" badge or indicator when destination is currently open

## ✅ Implementation Status

**COMPLETED**: All three pieces of information have been added to destination cards:

1. **Price Level** ✅
   - Added to `DestinationCard.tsx`
   - Shows as `$`, `$$`, `$$$`, or `$$$$` based on `price_level` field
   - Added `price_level` to database query in `server/services/homepage-loaders.ts`

2. **Rating** ✅
   - Added to `DestinationCard.tsx`
   - Shows as star emoji (⭐) + rating number (e.g., "⭐ 4.5")
   - Uses existing `rating` field from database

3. **Open Now Status** ✅
   - Added to `DestinationCard.tsx`
   - Uses `isOpenNow()` utility function from `lib/utils/opening-hours.ts`
   - Shows green "Open now" badge with clock icon when destination is currently open
   - Uses `opening_hours_json`, `timezone_id`, and `utc_offset` fields

All information is displayed in a horizontal row below the micro description, before the ML Forecasting badges.

