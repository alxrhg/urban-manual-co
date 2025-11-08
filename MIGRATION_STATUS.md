# Supabase Migration Status

## Migration Files Overview

### supabase/migrations/ (Active Migrations)
This is the **primary migration folder** for Supabase CLI. All migrations here should be applied.

**Total:** 40 migration files

**Latest Migrations:**
- `421_ensure_michelin_is_dining.sql` - ✅ **NEW** - Ensures Michelin-starred destinations are categorized as Dining
- `420_add_nested_destinations.sql` - Adds parent-child destination support
- `419_fix_user_profiles_rls.sql` - Fixes RLS on user_profiles
- `418_fix_additional_function_security.sql` - Additional function security fixes
- `417_fix_all_security_issues.sql` - Comprehensive security fixes
- `416_enable_rls_co_visit_signals.sql` - Enables RLS on co_visit_signals

### migrations/ (Legacy Migrations)
This folder contains **old migrations** that may have been applied manually or are duplicates.

**Total:** 30+ migration files

**Status:** These should be reviewed and potentially consolidated or removed if already applied.

## How to Check Migration Status

### Option 1: Using Supabase CLI (Recommended)

```bash
# 1. Login to Supabase
npx supabase login

# 2. Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# 3. Check migration status
npx supabase migration list

# 4. Apply pending migrations
npx supabase db push
```

### Option 2: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Database > Migrations**
4. See which migrations have been applied

### Option 3: Check Database Directly

Run this SQL in Supabase SQL Editor:

```sql
-- Check applied migrations
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC 
LIMIT 20;
```

## Pending Migrations to Apply

### Critical: `421_ensure_michelin_is_dining.sql`
**Status:** ⚠️ **NOT APPLIED** (Created recently)

**What it does:**
- Updates existing destinations with Michelin stars to category 'Dining'
- Creates trigger to auto-enforce this rule
- Adds database constraint

**To apply:**
```bash
# Via CLI (after linking)
npx supabase db push

# OR manually in Supabase Dashboard > SQL Editor
# Copy contents of supabase/migrations/421_ensure_michelin_is_dining.sql
```

## Migration Cleanup Recommendations

1. **Review old migrations/** folder:
   - Many files may be duplicates of supabase/migrations/
   - Some may have been applied manually
   - Consider archiving or removing if confirmed applied

2. **Consolidate if needed:**
   - If migrations/ contains unique changes not in supabase/migrations/
   - Create new migration in supabase/migrations/ with those changes
   - Then remove from migrations/

3. **Keep supabase/migrations/ as single source of truth:**
   - All new migrations should go here
   - Use Supabase CLI to manage them

## Next Steps

1. ✅ Link Supabase project: `npx supabase link --project-ref YOUR_PROJECT_REF`
2. ✅ Check status: `npx supabase migration list`
3. ✅ Apply pending: `npx supabase db push`
4. ✅ Review and clean up old migrations/ folder
5. ✅ Verify all migrations are applied in Supabase Dashboard

