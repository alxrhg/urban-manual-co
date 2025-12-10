# Duplicate Columns Analysis

Analysis of potential duplicate columns in the destinations table that could be merged.

## 🔴 Clear Duplicates (Should Merge)

### 1. Architect Fields
- **`architect`** (column 69) - null
- **`architect_name`** (column 28) - null
- **Recommendation:** Keep `architect`, remove `architect_name`

### 2. Phone Fields
- **`phone`** (column 17) - null (legacy)
- **`phone_number`** (column 54) - null
- **Recommendation:** Keep `phone_number`, remove `phone`. Note: `international_phone_number` is different (formatted version)

### 3. Website Fields
- **`website`** (column 16) - string
- **`website_url`** (column 96) - null
- **Recommendation:** Keep `website`, remove `website_url` (or migrate data and use `website_url`)

### 4. Location Coordinates
- **`lat`** (column 13) - number (0)
- **`latitude`** (column 65) - number (40.7030072)
- **`long`** (column 14) - number (0)
- **`longitude`** (column 66) - number (-73.901347)
- **Recommendation:** Keep `latitude` and `longitude`, remove `lat` and `long`. The `lat`/`long` fields appear to be legacy with default 0 values.

### 5. Enrichment Timestamps
- **`last_enriched`** (column 46) - null (legacy)
- **`last_enriched_at`** (column 56) - null
- **Recommendation:** Keep `last_enriched_at`, remove `last_enriched`

### 6. Save Count
- **`save_count`** (column 50) - number (0)
- **`saves_count`** (column 89) - number (0)
- **Recommendation:** Keep `saves_count` (more consistent naming), remove `save_count` (or migrate data)

### 7. Best Months
- **`best_visit_months`** (column 103) - array[7] (has data)
- **`best_months`** (column 170) - null
- **Recommendation:** Keep `best_visit_months`, remove `best_months`

### 8. Opening Hours (Legacy)
- **`opening_hours`** (column 22) - null (legacy)
- **`opening_hours_json`** (column 63) - string (has data)
- **Recommendation:** Keep `opening_hours_json`, remove `opening_hours` if all data is migrated

## 🟡 Potential Duplicates (Need Data Check)

### 9. Address Fields
- **`address`** (column 24) - null
- **`formatted_address`** (column 60) - string (has data)
- **Recommendation:** Check if `address` has any data. If not, remove. If yes, decide: keep `formatted_address` (from Google) or merge.

### 10. Embedding Fields
- **`embedding`** (column 93) - string (has data)
- **`vector_embedding`** (column 86) - null
- **Recommendation:** Check if `vector_embedding` is used anywhere. If not, remove. They might be same data in different formats.

### 11. Price Fields
- **`price_range`** (column 21) - null
- **`price_level`** (column 53) - null
- **`price_range_local`** (column 115) - null
- **Recommendation:** These might serve different purposes:
  - `price_level`: 1-4 scale ($, $$, $$$, $$$$)
  - `price_range`: Text description
  - `price_range_local`: Local currency format
  - **Action:** Check usage. `price_range` might be legacy.

### 12. Content Summary Fields
- **`short_summary`** (column 175) - null
- **`micro_description`** (column 173) - null
- **`ai_short_summary`** (column 78) - null
- **Recommendation:** These might serve different purposes:
  - `micro_description`: 1-line for cards
  - `short_summary`: Brief summary
  - `ai_short_summary`: AI-generated
  - **Action:** Check usage and consolidate if redundant.

## 🟢 Intentional Differences (Keep Separate)

### 13. Designer/Interior Fields
- **`designer_name`** (column 27) - null
- **`interior_style`** (column 32) - null
- **Note:** These are different from the new Exa fields:
  - `interior_designer` (to be added)
  - `architectural_style` (already exists)
- **Recommendation:** Keep existing fields, map Exa data to them:
  - Exa `interior_designer` → `designer_name`
  - Exa `architectural_style` → `architectural_style` (already exists)
  - Exa `design_period` → new field (useful)

### 14. Instagram Fields
- **`instagram`** (column 19) - null (legacy)
- **`instagram_handle`** (column 57) - null
- **`instagram_url`** (column 58) - null
- **Recommendation:** Keep `instagram_handle` and `instagram_url`, remove `instagram` if unused.

## 📋 Recommended Merge Plan

### Phase 1: Safe Removals (No Data Loss)
1. Remove `architect_name` → use `architect`
2. Remove `phone` → use `phone_number`
3. Remove `website_url` → use `website` (or vice versa after data check)
4. Remove `lat` and `long` → use `latitude` and `longitude`
5. Remove `last_enriched` → use `last_enriched_at`
6. Remove `best_months` → use `best_visit_months`
7. Remove `opening_hours` → use `opening_hours_json` (after data check)

### Phase 2: Data Migration Required
1. Migrate `save_count` → `saves_count` (if `save_count` has data)
2. Check and migrate `address` → `formatted_address` if needed
3. Consolidate summary fields after usage analysis

### Phase 3: Field Mapping for Exa
Instead of adding new fields, map Exa data to existing:
- Exa `architect` → `architect` (already exists)
- Exa `interior_designer` → `designer_name` (already exists)
- Exa `architectural_style` → `architectural_style` (already exists)
- Exa `design_period` → **NEW** (useful, doesn't exist)
- Exa `design_firm` → **NEW** (useful, doesn't exist)

## SQL Migration Script

### Migration 028: Merge Duplicate Columns

**Status:** ✅ Created in `supabase/migrations/028_merge_duplicate_columns.sql`

Merges:
1. `architect_name` → `architect`
2. `phone` → `phone_number`
3. `website_url` → `website`

```sql
-- 1. Merge architect fields (architect_name → architect)
UPDATE destinations 
SET architect = architect_name
WHERE architect IS NULL AND architect_name IS NOT NULL AND architect_name != '';
ALTER TABLE destinations DROP COLUMN IF EXISTS architect_name;

-- 2. Merge phone fields (phone → phone_number)
UPDATE destinations 
SET phone_number = phone
WHERE phone_number IS NULL AND phone IS NOT NULL AND phone != '';
ALTER TABLE destinations DROP COLUMN IF EXISTS phone;

-- 3. Merge website fields (website_url → website)
UPDATE destinations 
SET website = website_url
WHERE website IS NULL AND website_url IS NOT NULL AND website_url != '';
ALTER TABLE destinations DROP COLUMN IF EXISTS website_url;
```

### Remaining Merges (Phase 1)

```sql
-- Phase 1: Merge duplicates (safe removals)
-- Note: Run these after verifying data migration

-- 2. Merge phone fields
UPDATE destinations 
SET phone_number = COALESCE(phone_number, phone)
WHERE phone_number IS NULL AND phone IS NOT NULL;

-- 3. Merge website fields
UPDATE destinations 
SET website = COALESCE(website, website_url)
WHERE website IS NULL AND website_url IS NOT NULL;

-- 4. Merge location fields
UPDATE destinations 
SET latitude = COALESCE(latitude, lat)
WHERE latitude IS NULL AND lat != 0;

UPDATE destinations 
SET longitude = COALESCE(longitude, long)
WHERE longitude IS NULL AND long != 0;

-- 5. Merge save counts
UPDATE destinations 
SET saves_count = COALESCE(saves_count, save_count)
WHERE saves_count = 0 AND save_count > 0;

-- 6. Merge best months
UPDATE destinations 
SET best_visit_months = COALESCE(best_visit_months, best_months)
WHERE best_visit_months IS NULL AND best_months IS NOT NULL;

-- After data migration, drop duplicate columns:
-- ✅ architect_name - DONE (see migration 028)
-- ✅ phone - DONE (see migration 028)
-- ✅ website_url - DONE (see migration 028)
-- ALTER TABLE destinations DROP COLUMN IF EXISTS lat;
-- ALTER TABLE destinations DROP COLUMN IF EXISTS long;
-- ALTER TABLE destinations DROP COLUMN IF EXISTS last_enriched;
-- ALTER TABLE destinations DROP COLUMN IF EXISTS save_count;
-- ALTER TABLE destinations DROP COLUMN IF EXISTS best_months;
-- ALTER TABLE destinations DROP COLUMN IF EXISTS opening_hours;
```

## Summary

**Total duplicates identified:** 12 pairs/groups
- **Clear duplicates:** 8 pairs
- **Potential duplicates:** 4 groups (need data check)
- **Estimated columns that can be removed:** 8-12 columns

**Impact:** Reduces from 181 columns to ~169-173 columns, making the schema cleaner and easier to maintain.

