-- Migration: Merge Duplicate Columns
-- Merges duplicate columns into their canonical versions
-- Date: 2025-01-XX

-- ============================================================================
-- 1. Merge architect_name into architect
-- ============================================================================
-- Only update where architect is NULL and architect_name has a value
UPDATE destinations 
SET architect = architect_name
WHERE architect IS NULL 
  AND architect_name IS NOT NULL 
  AND architect_name != '';

-- Verify merge (optional)
-- SELECT COUNT(*) as merged_count 
-- FROM destinations 
-- WHERE architect IS NOT NULL 
--   AND architect_name IS NOT NULL 
--   AND architect = architect_name;

-- Drop the duplicate column
ALTER TABLE destinations DROP COLUMN IF EXISTS architect_name;

-- ============================================================================
-- 2. Merge phone into phone_number
-- ============================================================================
-- Only update where phone_number is NULL and phone has a value
UPDATE destinations 
SET phone_number = phone
WHERE phone_number IS NULL 
  AND phone IS NOT NULL 
  AND phone != '';

-- Verify merge (optional)
-- SELECT COUNT(*) as merged_count 
-- FROM destinations 
-- WHERE phone_number IS NOT NULL 
--   AND phone IS NOT NULL 
--   AND phone_number = phone;

-- Drop the duplicate column
ALTER TABLE destinations DROP COLUMN IF EXISTS phone;

-- ============================================================================
-- 3. Merge website_url into website
-- ============================================================================
-- Only update where website is NULL and website_url has a value
UPDATE destinations 
SET website = website_url
WHERE website IS NULL 
  AND website_url IS NOT NULL 
  AND website_url != '';

-- Verify merge (optional)
-- SELECT COUNT(*) as merged_count 
-- FROM destinations 
-- WHERE website IS NOT NULL 
--   AND website_url IS NOT NULL 
--   AND website = website_url;

-- Drop the duplicate column
ALTER TABLE destinations DROP COLUMN IF EXISTS website_url;

-- ============================================================================
-- Rollback Notes:
-- ============================================================================
-- If you need to rollback, you can recreate the columns:
-- ALTER TABLE destinations ADD COLUMN architect_name text;
-- ALTER TABLE destinations ADD COLUMN phone text;
-- ALTER TABLE destinations ADD COLUMN website_url text;

