-- Migration: Ensure Michelin-starred destinations are categorized as Dining
-- Date: 2025-01-XX
-- Purpose: Michelin stars are only awarded to restaurants, so any destination with
--          michelin_stars > 0 must have category = 'Dining'

BEGIN;

-- Step 1: Update all existing destinations with Michelin stars to be 'Dining'
UPDATE destinations
SET category = 'Dining'
WHERE michelin_stars IS NOT NULL 
  AND michelin_stars > 0 
  AND category != 'Dining'
  AND category IS NOT NULL;

-- Step 2: Create a trigger function that automatically sets category to 'Dining'
-- when michelin_stars is set to a value > 0
CREATE OR REPLACE FUNCTION ensure_michelin_is_dining()
RETURNS TRIGGER AS $$
BEGIN
  -- If michelin_stars is being set to > 0, ensure category is 'Dining'
  IF NEW.michelin_stars IS NOT NULL AND NEW.michelin_stars > 0 THEN
    NEW.category := 'Dining';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger that fires before INSERT or UPDATE
DROP TRIGGER IF EXISTS trigger_ensure_michelin_is_dining ON destinations;

CREATE TRIGGER trigger_ensure_michelin_is_dining
  BEFORE INSERT OR UPDATE OF michelin_stars, category
  ON destinations
  FOR EACH ROW
  EXECUTE FUNCTION ensure_michelin_is_dining();

-- Step 4: Add a check constraint to enforce the rule at the database level
-- This prevents invalid data even if the trigger is bypassed
ALTER TABLE destinations
  DROP CONSTRAINT IF EXISTS chk_michelin_is_dining;

ALTER TABLE destinations
  ADD CONSTRAINT chk_michelin_is_dining
  CHECK (
    -- If michelin_stars > 0, then category must be 'Dining'
    (michelin_stars IS NULL OR michelin_stars = 0 OR category = 'Dining')
  );

COMMENT ON CONSTRAINT chk_michelin_is_dining ON destinations IS 
  'Ensures that any destination with Michelin stars is categorized as Dining';

COMMIT;

