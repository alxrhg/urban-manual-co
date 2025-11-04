# Database Migration Audit & Implementation Guide

**Date:** November 4, 2025  
**Status:** Audit Complete - Ready for Execution

---

## 📋 Migration Status Overview

### ✅ **Already Implemented & Used** (Must Run)
These migrations are actively used in the codebase:

1. **018_intelligence.sql** ⚠️ **PARTIALLY USED**
   - Tables: `co_visit_signals`, `discovery_prompts`, `personalization_scores`, `forecasting_data`, `opportunity_alerts`, `destination_relationships`
   - Columns: `rank_score`, `is_open_now` on destinations
   - **Status:** Used in `app/api/personalization/[user_id]/route.ts`, `app/api/similar/[id]/route.ts`, `app/api/alerts/[user_id]/route.ts`
   - **Action:** ✅ RUN (if columns missing)

2. **019_audit_current_state.sql** ✅ **REQUIRED**
   - Schema audit utilities
   - **Status:** Required for schema consistency
   - **Action:** ✅ RUN FIRST

3. **020_consolidate_schema.sql** ✅ **REQUIRED**
   - Consolidates `saved_destinations` → `saved_places`, `visited_destinations` → `visited_places`
   - **Status:** CRITICAL - Used everywhere in codebase
   - **Action:** ✅ RUN (if schema not consolidated)

4. **021_add_helper_functions.sql** ✅ **REQUIRED**
   - Functions: `get_user_saved_destinations()`, `get_user_visited_destinations()`
   - **Status:** Used in `app/api/account/insights/route.ts`
   - **Action:** ✅ RUN

5. **022_add_tags_to_rpc.sql** ✅ **REQUIRED**
   - Adds `tags` and `user_tags` to RPC functions
   - **Status:** Used in account insights
   - **Action:** ✅ RUN

6. **023_enable_vector_search.sql** ✅ **REQUIRED**
   - Enables pgvector extension
   - Adds `embedding` column to destinations
   - **Status:** Used in `app/api/ai-chat/route.ts`, `app/api/search/route.ts`
   - **Action:** ✅ RUN (if embeddings not enabled)

7. **024_hybrid_search_function.sql** ✅ **REQUIRED**
   - Creates `search_destinations_hybrid()` function
   - **Status:** Used in search endpoints
   - **Action:** ✅ RUN

8. **025_fix_embedding_dimension.sql** ✅ **REQUIRED**
   - Fixes embedding dimension from 3072 to 1536
   - **Status:** Required for OpenAI embeddings
   - **Action:** ✅ RUN

9. **025_conversation_tables.sql** ⚠️ **DUPLICATE**
   - Creates `conversation_sessions`, `conversation_messages`
   - **Status:** Duplicate of migration 300
   - **Action:** ⚠️ CHECK - Use 300 instead

10. **026_add_advanced_enrichment_fields.sql** ✅ **REQUIRED**
    - Adds: `photos_json`, `weather_json`, `events_json`, `routes_json`, `currency_code`, etc.
    - **Status:** Used in `app/api/ai-chat/route.ts` (enrichment fetching)
    - **Action:** ✅ RUN (if enrichment columns missing)

---

### 🟡 **Advanced Features** (Optional - Run if Needed)

11. **200_complete_intelligence.sql** ⚠️ **OPTIONAL**
    - Ranking, trending, co-visitation, relationships, personalization
    - **Status:** Used in `app/api/cron/compute-intelligence/route.ts`
    - **Action:** ⚠️ RUN if you want intelligence features (trending, ranking)

12. **210_location_relationships.sql** ⚠️ **OPTIONAL**
    - Creates `locations` table for neighborhoods/districts
    - Seeds Tokyo, Paris, London, NYC, LA neighborhoods
    - **Status:** Used in search for geographic expansion
    - **Action:** ⚠️ RUN if you want location-based search

13. **300_conversational_ai.sql** ✅ **REQUIRED FOR CONVERSATIONAL AI**
    - Enhanced `conversation_sessions` and `conversation_messages` tables
    - Adds `context`, `context_summary`, `embedding` columns
    - **Status:** Used in `app/api/conversation/[user_id]/route.ts`, `app/api/conversation/utils/contextHandler.ts`
    - **Action:** ✅ RUN (if conversational AI needed)

14. **301_asimov_sync_trigger.sql** ⚠️ **OPTIONAL**
    - Asimov sync integration
    - **Status:** Used if Asimov is configured
    - **Action:** ⚠️ RUN only if using Asimov

15. **999_cleanup_old_tables.sql** ⚠️ **OPTIONAL**
    - Drops old `saved_destinations` and `visited_destinations` tables
    - **Status:** Cleanup only
    - **Action:** ⚠️ RUN ONLY after verifying migration 020 worked

---

### ❌ **Missing Migrations** (Not Found in Codebase)

The following migrations were mentioned but not found:
- `400_collections_system.sql`
- `401_itineraries_system.sql`
- `402_achievements_system.sql`
- `403_social_features.sql`
- `404_visited_enhancements.sql`

**Action:** These may be in a different location or not yet created.

---

## 🎯 Recommended Execution Order

### **Phase 1: Core Schema (MUST RUN)**

```sql
1. 019_audit_current_state.sql          -- Audit first
2. 020_consolidate_schema.sql           -- Consolidate schema
3. 021_add_helper_functions.sql         -- Add helper functions
4. 022_add_tags_to_rpc.sql             -- Add tags support
```

### **Phase 2: Vector Search (REQUIRED for AI)**

```sql
5. 023_enable_vector_search.sql        -- Enable pgvector
6. 024_hybrid_search_function.sql      -- Hybrid search
7. 025_fix_embedding_dimension.sql     -- Fix dimensions
```

### **Phase 3: Intelligence Features (OPTIONAL)**

```sql
8. 018_intelligence.sql                 -- Basic intelligence
9. 200_complete_intelligence.sql        -- Full intelligence layer
10. 210_location_relationships.sql      -- Location relationships
```

### **Phase 4: Advanced Features (OPTIONAL)**

```sql
11. 026_add_advanced_enrichment_fields.sql  -- Enrichment data
12. 300_conversational_ai.sql              -- Conversational AI
13. 301_asimov_sync_trigger.sql            -- Asimov sync (if using)
```

### **Phase 5: Cleanup (LAST)**

```sql
14. 999_cleanup_old_tables.sql          -- Cleanup old tables
```

---

## ✅ Verification Checklist

After running migrations, verify:

### **Core Tables:**
- [ ] `saved_places` exists
- [ ] `visited_places` exists
- [ ] `destinations` has `embedding` column (vector(1536))
- [ ] `destinations` has `rank_score`, `is_open_now` columns

### **Functions:**
- [ ] `get_user_saved_destinations()` exists
- [ ] `get_user_visited_destinations()` exists
- [ ] `search_destinations_hybrid()` exists
- [ ] `match_destinations()` exists

### **Intelligence Tables** (if Phase 3 run):
- [ ] `co_visit_signals` exists
- [ ] `personalization_scores` exists
- [ ] `forecasting_data` exists
- [ ] `opportunity_alerts` exists
- [ ] `destination_relationships` exists

### **Conversational AI** (if Phase 4 run):
- [ ] `conversation_sessions` exists
- [ ] `conversation_messages` exists
- [ ] `conversation_messages` has `embedding` column

### **Enrichment** (if Phase 4 run):
- [ ] `destinations` has `photos_json` column
- [ ] `destinations` has `current_weather_json` column
- [ ] `destinations` has `nearby_events_json` column
- [ ] `destinations` has `route_from_city_center_json` column

---

## 🔍 How to Check What's Already Run

Run this SQL in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'saved_places', 
    'visited_places',
    'conversation_sessions',
    'conversation_messages',
    'co_visit_signals',
    'personalization_scores',
    'locations'
  )
ORDER BY table_name;

-- Check if columns exist on destinations
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'destinations' 
  AND column_name IN (
    'embedding',
    'rank_score',
    'is_open_now',
    'photos_json',
    'current_weather_json',
    'nearby_events_json'
  )
ORDER BY column_name;

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_user_saved_destinations',
    'get_user_visited_destinations',
    'search_destinations_hybrid',
    'match_destinations'
  )
ORDER BY routine_name;
```

---

## ⚠️ Important Notes

1. **Migration 025_conversation_tables.sql vs 300_conversational_ai.sql:**
   - Migration 025 is simpler (basic tables)
   - Migration 300 is comprehensive (includes context, embeddings)
   - **Recommendation:** Use migration 300 if you want full conversational AI features

2. **Migration 018 vs 200:**
   - Migration 018: Basic intelligence columns
   - Migration 200: Complete intelligence system with functions
   - **Recommendation:** Run 018 first, then 200 (200 will extend 018)

3. **Safe to Run Multiple Times:**
   - All migrations use `IF NOT EXISTS` / `IF EXISTS` checks
   - Safe to re-run if needed
   - Will skip if already exists

4. **Backup First:**
   - Always backup your database before running migrations
   - Use Supabase dashboard → Database → Backups

---

## 🚀 Quick Start (Minimum Required)

If you just want to get started with basic functionality:

```sql
-- Run these 7 migrations in order:
1. 019_audit_current_state.sql
2. 020_consolidate_schema.sql
3. 021_add_helper_functions.sql
4. 022_add_tags_to_rpc.sql
5. 023_enable_vector_search.sql
6. 024_hybrid_search_function.sql
7. 025_fix_embedding_dimension.sql
```

This will enable:
- ✅ Saved/visited places
- ✅ Vector search
- ✅ AI chat functionality
- ✅ Account insights

---

## 📝 Next Steps

1. **Review this audit**
2. **Check what's already run** (use SQL queries above)
3. **Run migrations in order** (Phase 1 → Phase 2 → etc.)
4. **Verify** using checklist above
5. **Test** features in your app

---

**Last Updated:** November 4, 2025  
**Author:** Migration Audit

