# Migration Troubleshooting Guide

## Common Migration Failure Causes

### 1. **Missing Dependencies**
- Tables referenced don't exist yet
- Extensions (pgvector) not enabled
- Columns referenced don't exist

### 2. **Constraint Conflicts**
- Foreign key constraints fail
- Unique constraints violated
- Check constraints don't match existing data

### 3. **RLS Policy Conflicts**
- Policies already exist
- RLS enabled but policies missing
- Service role access issues

### 4. **Data Type Mismatches**
- UUID vs INTEGER mismatches
- Vector dimension mismatches
- JSONB structure issues

---

## How to Diagnose Migration Failures

### Step 1: Get the Exact Error Message

When a migration fails, Supabase will show an error. Copy the full error message including:
- Error code (e.g., `ERROR: 42703`)
- Error message
- Line number where it failed
- Context around the error

**Example:**
```
ERROR: 42703: column "discovery_prompts" does not exist
LINE 231: ALTER TABLE discovery_prompts
```

### Step 2: Check What's Missing

Run this diagnostic query in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'destinations',
    'saved_places',
    'visited_places',
    'conversation_sessions',
    'conversation_messages',
    'discovery_prompts',
    'co_visit_signals',
    'personalization_scores',
    'forecasting_data',
    'opportunity_alerts',
    'destination_relationships',
    'user_interactions',
    'locations'
  )
ORDER BY table_name;

-- Check if pgvector extension exists
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';

-- Check if destinations has embedding column
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'destinations' 
  AND column_name IN ('embedding', 'rank_score', 'is_open_now')
ORDER BY column_name;
```

### Step 3: Check Migration Dependencies

**Migration 200 depends on:**
- ✅ `destinations` table
- ✅ `saved_places` table (or will create it)
- ✅ `visited_places` table (or will create it)
- ✅ `pgvector` extension
- ✅ `embedding` column (optional - checks before use)
- ⚠️ `discovery_prompts` table (optional - only alters if exists)

**Migration 300 depends on:**
- ✅ `auth.users` table (Supabase default)
- ✅ `pgvector` extension
- ✅ `vector(1536)` type support

**Migration 400-404:**
- These don't exist in the codebase yet
- Need to be created or they're in a different location

---

## Quick Fixes for Common Errors

### Error: "column does not exist"
**Solution:** Use the `_FIXED` versions of migrations that check for dependencies first.

### Error: "relation already exists"
**Solution:** The migration uses `IF NOT EXISTS` - safe to ignore or skip that part.

### Error: "permission denied"
**Solution:** Run migrations as service role, not as regular user.

### Error: "function already exists with different parameters"
**Solution:** Drop the function first:
```sql
DROP FUNCTION IF EXISTS function_name CASCADE;
```

### Error: "constraint violation"
**Solution:** Check existing data, clean up invalid rows, then re-run migration.

### Error: "extension vector does not exist"
**Solution:** Enable pgvector first:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Recommended Migration Order (Fixed)

### Phase 1: Core (MUST RUN FIRST)
```sql
1. 019_audit_current_state.sql          -- Diagnostic only
2. 020_consolidate_schema.sql           -- Creates saved_places/visited_places
3. 021_add_helper_functions.sql         -- Helper functions
4. 022_add_tags_to_rpc.sql             -- Tags support
```

### Phase 2: Vector Search
```sql
5. 023_enable_vector_search.sql        -- pgvector + embedding column
6. 024_hybrid_search_function.sql      -- Search function
7. 025_fix_embedding_dimension.sql     -- Fix dimensions
```

### Phase 3: Intelligence (Use FIXED versions)
```sql
8. 018_intelligence.sql                 -- Basic intelligence
9. 200_complete_intelligence_FIXED.sql -- Full intelligence (FIXED VERSION)
10. 210_location_relationships.sql      -- Locations
```

### Phase 4: Advanced Features (Use FIXED versions)
```sql
11. 026_add_advanced_enrichment_fields.sql  -- Enrichment
12. 300_conversational_ai_FIXED.sql         -- Conversational AI (FIXED VERSION)
13. 301_asimov_sync_trigger.sql            -- Asimov (if using)
```

---

## Migration 400-404 Status

These migrations were mentioned but **don't exist in the codebase**:

- `400_collections_system.sql` ❌ NOT FOUND
- `401_itineraries_system.sql` ❌ NOT FOUND  
- `402_achievements_system.sql` ❌ NOT FOUND
- `403_social_features.sql` ❌ NOT FOUND (but `migrations/social-features.sql` exists)
- `404_visited_enhancements.sql` ❌ NOT FOUND

**If you need these:**
1. Check if they exist in Supabase dashboard (direct SQL)
2. Check if they're named differently (e.g., `migrations/social-features.sql`)
3. Create them based on the features needed

---

## Next Steps

1. **Share the exact error messages** from migrations 200, 300, 400, 401
2. **Run the diagnostic queries** above to see what's missing
3. **Use the FIXED versions** of migrations 200 and 300 I created
4. **Check migration order** - some migrations depend on others

---

## Need Help?

Please share:
- Exact error message (copy/paste from Supabase)
- Which migration failed
- What step you were on (which migrations already succeeded)
- Output from diagnostic queries above

