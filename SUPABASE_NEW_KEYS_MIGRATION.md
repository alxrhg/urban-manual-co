# Supabase New Keys Migration Guide

## Overview

Supabase is transitioning from legacy keys (`anon` and `service_role`) to new keys (`publishable` and `secret`). This migration enhances security and provides better key management.

## Timeline

- **November 1, 2025**: New projects will no longer have access to legacy keys
- **Late 2026**: All projects must transition to new keys
- **Current**: Legacy keys still work, but migration is recommended

## Key Mappings

| Legacy Key | New Key | Usage |
|------------|---------|-------|
| `anon` | `publishable` | Client-side, respects RLS |
| `service_role` | `secret` | Server-side, bypasses RLS |

## Benefits of New Keys

1. **Enhanced Security**
   - Create multiple secret keys for different services
   - Revoke keys individually without affecting others
   - Better key rotation capabilities

2. **Better Management**
   - Assign specific keys to different parts of your application
   - Track key usage
   - More granular control

## How to Get New Keys

1. Go to your Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Look for **"Opt-in to new API keys"** or **"New Keys"** section
4. Generate your new `publishable` and `secret` keys
5. Copy the keys (they work as drop-in replacements)

## Environment Variable Naming

### Recommended (New Keys)
```bash
# Client-side (browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here

# Server-side (API routes, scripts)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-secret-key-here
```

### Current (Legacy Keys - Still Supported)
```bash
# Client-side
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Server-side
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Migration Steps

1. **Get New Keys from Supabase Dashboard**
   - Settings → API → Opt-in to new keys

2. **Update Environment Variables**
   - Add new keys to Vercel (keep old ones during transition)
   - Update `.env.local` for local development

3. **Update Code (Optional - Current Code Supports Both)**
   - Our code already supports both naming conventions
   - Can add explicit support for new key names

4. **Test Thoroughly**
   - Test in development first
   - Verify all Supabase operations work
   - Check RLS policies still work correctly

5. **Deploy**
   - Set new keys in Vercel
   - Redeploy (NEXT_PUBLIC_ vars are inlined at build time)

6. **Remove Legacy Keys (After Verification)**
   - Once confirmed new keys work, remove legacy keys

## Code Updates Needed

Our current code in `lib/supabase.ts` already supports fallback:
- Tries `NEXT_PUBLIC_SUPABASE_ANON_KEY` first
- Falls back to `SUPABASE_ANON_KEY`

We should add support for:
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new)
- `SUPABASE_SECRET_KEY` (new)

## Important Notes

- **Backward Compatible**: New keys work as drop-in replacements
- **Same Permissions**: `publishable` = `anon`, `secret` = `service_role`
- **RLS Still Applies**: `publishable` key respects RLS just like `anon`
- **No Code Changes Required**: New keys work with existing Supabase client code
- **Migration is Optional (for now)**: Legacy keys still work until late 2026

## Recommendation

**Yes, we should migrate to the new keys** because:
1. Better security and key management
2. Future-proof (required by late 2026)
3. No breaking changes - works as drop-in replacement
4. Can test migration now while legacy keys still work

## Next Steps

1. Get new keys from Supabase dashboard
2. Update code to support both old and new key names
3. Test with new keys
4. Update Vercel environment variables
5. Redeploy

