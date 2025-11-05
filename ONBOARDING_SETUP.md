# Onboarding Setup Instructions

This document outlines the new user onboarding feature that was added to Urban Manual.

## Overview

New users are now guided through a 4-step onboarding wizard after account creation to:
1. Select cities they're interested in exploring
2. Choose their interests (food, culture, nightlife, etc.)
3. Define their travel style
4. Set their budget preference

This personalization enables better AI recommendations from the start.

## Database Migration

A new migration file has been created: `supabase/migrations/017_add_onboarding_completed.sql`

### To apply the migration:

**Option 1: Using Supabase CLI (Recommended)**
```bash
supabase db push
```

**Option 2: Using Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the contents of `supabase/migrations/017_add_onboarding_completed.sql`

**Option 3: Programmatically**
```javascript
// Run once to apply the migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = fs.readFileSync('supabase/migrations/017_add_onboarding_completed.sql', 'utf8');

// Execute the SQL
// Note: Supabase client doesn't support raw SQL execution directly
// You'll need to use a PostgreSQL client or the dashboard
```

### What the migration does:

1. Adds `onboarding_completed` (boolean) field to `user_profiles` table
2. Adds `onboarding_completed_at` (timestamp) field to `user_profiles` table
3. Creates an index on `onboarding_completed` for faster queries
4. Sets `onboarding_completed = true` for all existing users (grandfathered in)

## New Files Created

### Routes
- `/app/onboarding/page.tsx` - 4-step onboarding wizard UI

### API Endpoints
- `/app/api/onboarding/complete/route.ts` - Mark onboarding as completed
  - `POST /api/onboarding/complete` - Complete onboarding
  - `GET /api/onboarding/complete` - Check onboarding status

- `/app/api/onboarding/first-recommendations/route.ts` - Generate first recommendations
  - `GET /api/onboarding/first-recommendations` - Get personalized starter picks

### Components
- `/components/OnboardingWelcome.tsx` - Welcome banner shown after onboarding

### Modified Files
- `/app/auth/callback/page.tsx` - Added onboarding check & redirect
- `/app/auth/login/page.tsx` - Added onboarding check after sign-in
- `/app/page.tsx` - Added OnboardingWelcome component
- `/app/api/account/preferences/route.ts` - Already existed, used for saving preferences

## User Flow

### New User Journey
1. User signs up via email/password or Apple
2. Auth callback checks if `onboarding_completed = false`
3. User is redirected to `/onboarding`
4. User completes 4-step wizard:
   - Step 1: Select cities (at least 1 required)
   - Step 2: Select interests (minimum 3 required)
   - Step 3: Choose travel style (1 required)
   - Step 4: Set budget preference (defaults to $$)
5. Preferences saved via `/api/account/preferences`
6. Onboarding marked complete via `/api/onboarding/complete`
7. First recommendations generated via `/api/onboarding/first-recommendations`
8. User redirected to homepage with `?onboarding_complete=true` query param
9. Welcome banner appears showing personalized message
10. User can dismiss banner and explore personalized recommendations

### Existing User Journey
- No changes; existing users are marked as `onboarding_completed = true` by migration
- They can update preferences anytime in account settings

## Testing

To test the onboarding flow:

1. Create a new test account
2. Verify redirect to `/onboarding`
3. Complete all 4 steps
4. Verify redirect to homepage with welcome banner
5. Check that preferences are saved in user_profiles table
6. Verify personalized recommendations appear

## Analytics

The following events are tracked:

- `onboarding_completed` - When user finishes onboarding
- `first_recommendations_viewed` - When first recommendations are shown

These are logged to the `user_interactions` table for analysis.

## Future Enhancements

Based on the UX review, consider adding:

1. **Skip Option** - Allow users to skip onboarding (with prompt to complete later)
2. **More Granular Preferences** - Dietary restrictions, accessibility needs
3. **Social Onboarding** - Import preferences from social profiles
4. **Progressive Disclosure** - Show preference fine-tuning after first use
5. **Onboarding Analytics Dashboard** - Track completion rates, drop-off points

## Troubleshooting

### User stuck in onboarding loop
- Check `user_profiles.onboarding_completed` field in database
- Manually set to `true` if needed

### Preferences not saving
- Verify `/api/account/preferences` endpoint is working
- Check network tab for errors
- Verify Supabase RLS policies allow updates

### First recommendations not showing
- Check `/api/onboarding/first-recommendations` endpoint
- Verify user has destinations matching their city/category preferences
- Falls back to trending destinations if < 3 matches found

## Contact

For issues or questions about the onboarding feature, please check:
- UX_AI_PRODUCT_REVIEW.md (full strategic review)
- This ONBOARDING_SETUP.md file
