-- Migration: Merge More Duplicate Columns
-- Merges additional duplicate columns into their canonical versions
-- Date: 2025-01-XX

-- ============================================================================
-- 1. Merge lat/long into latitude/longitude
-- ============================================================================
-- Only update where latitude/longitude is NULL and lat/long has a value
UPDATE destinations 
SET latitude = lat
WHERE latitude IS NULL 
  AND lat IS NOT NULL 
  AND lat != 0;

UPDATE destinations 
SET longitude = long
WHERE longitude IS NULL 
  AND long IS NOT NULL 
  AND long != 0;

-- Drop the duplicate columns
ALTER TABLE destinations DROP COLUMN IF EXISTS lat;
ALTER TABLE destinations DROP COLUMN IF EXISTS long;

-- ============================================================================
-- 2. Merge last_enriched into last_enriched_at
-- ============================================================================
-- Only update where last_enriched_at is NULL and last_enriched has a value
UPDATE destinations 
SET last_enriched_at = last_enriched
WHERE last_enriched_at IS NULL 
  AND last_enriched IS NOT NULL;

-- Drop the duplicate column
ALTER TABLE destinations DROP COLUMN IF EXISTS last_enriched;

-- ============================================================================
-- 3. Merge save_count into saves_count
-- ============================================================================
-- Only update where saves_count is NULL/0 and save_count has a value
UPDATE destinations 
SET saves_count = save_count
WHERE (saves_count IS NULL OR saves_count = 0)
  AND save_count IS NOT NULL 
  AND save_count > 0;

-- Drop the duplicate column
ALTER TABLE destinations DROP COLUMN IF EXISTS save_count;

-- ============================================================================
-- 4. Merge best_months into best_visit_months
-- ============================================================================
-- Only update where best_visit_months is NULL and best_months has a value
UPDATE destinations 
SET best_visit_months = best_months
WHERE best_visit_months IS NULL 
  AND best_months IS NOT NULL;

-- Drop the duplicate column
ALTER TABLE destinations DROP COLUMN IF EXISTS best_months;

-- ============================================================================
-- 5. Merge opening_hours into opening_hours_json
-- ============================================================================
-- Note: opening_hours is likely a legacy field that may be in a different format
-- Only update where opening_hours_json is NULL and opening_hours has a value
-- Convert opening_hours to JSON string if it's not already JSON
UPDATE destinations 
SET opening_hours_json = 
  CASE 
    WHEN opening_hours::text LIKE '{%' THEN opening_hours::text
    ELSE json_build_object('legacy_data', opening_hours)::text
  END
WHERE opening_hours_json IS NULL 
  AND opening_hours IS NOT NULL;

-- Drop the duplicate column
ALTER TABLE destinations DROP COLUMN IF EXISTS opening_hours;

-- ============================================================================
-- Rollback Notes:
-- ============================================================================
-- If you need to rollback, you can recreate the columns:
-- ALTER TABLE destinations ADD COLUMN lat numeric;
-- ALTER TABLE destinations ADD COLUMN long numeric;
-- ALTER TABLE destinations ADD COLUMN last_enriched timestamptz;
-- ALTER TABLE destinations ADD COLUMN save_count integer;
-- ALTER TABLE destinations ADD COLUMN best_months integer[];
-- ALTER TABLE destinations ADD COLUMN opening_hours jsonb;

