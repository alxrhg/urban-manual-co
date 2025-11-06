-- Migration: Add Michelin Keys for Hotels
-- Date: 2025-11-06
-- Purpose: Add support for Michelin Keys hotel rating system (1-3 keys)
-- The Michelin Keys were introduced in 2024 as a hotel evaluation system

DO $$ BEGIN
  -- Add michelin_keys column for hotels (1-3 keys rating)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS michelin_keys integer;

  -- Add michelin_guide_url for direct links to Michelin Guide pages
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS michelin_guide_url text;

  -- Add michelin_updated_at to track when Michelin data was last updated
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS michelin_updated_at timestamptz;

  -- Add constraints to ensure valid Michelin ratings
  ALTER TABLE destinations ADD CONSTRAINT IF NOT EXISTS check_michelin_stars_valid
    CHECK (michelin_stars IS NULL OR (michelin_stars >= 0 AND michelin_stars <= 3));

  ALTER TABLE destinations ADD CONSTRAINT IF NOT EXISTS check_michelin_keys_valid
    CHECK (michelin_keys IS NULL OR (michelin_keys >= 1 AND michelin_keys <= 3));

EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error adding Michelin Keys columns: %', SQLERRM;
END $$;

-- Create index for Michelin Keys filtering
CREATE INDEX IF NOT EXISTS idx_destinations_michelin_keys
  ON destinations(michelin_keys)
  WHERE michelin_keys IS NOT NULL;

-- Create composite index for Michelin establishments (both restaurants and hotels)
CREATE INDEX IF NOT EXISTS idx_destinations_michelin_all
  ON destinations(michelin_stars, michelin_keys, crown)
  WHERE michelin_stars IS NOT NULL OR michelin_keys IS NOT NULL OR crown = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN destinations.michelin_keys IS 'Michelin Keys rating for hotels (1-3 keys). Introduced in 2024.';
COMMENT ON COLUMN destinations.michelin_stars IS 'Michelin stars for restaurants (0-3 stars)';
COMMENT ON COLUMN destinations.crown IS 'Michelin Bib Gourmand designation';
COMMENT ON COLUMN destinations.michelin_guide_url IS 'Direct URL to the Michelin Guide page for this destination';
COMMENT ON COLUMN destinations.michelin_updated_at IS 'Timestamp when Michelin data was last updated';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Michelin Keys migration completed successfully!';
  RAISE NOTICE '   - Added michelin_keys column (1-3 for hotels)';
  RAISE NOTICE '   - Added michelin_guide_url column';
  RAISE NOTICE '   - Added michelin_updated_at timestamp';
  RAISE NOTICE '   - Created indexes for efficient filtering';
END $$;
