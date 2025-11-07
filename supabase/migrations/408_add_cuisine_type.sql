-- Migration: Add cuisine_type column to destinations
-- Extracts cuisine type from Google Places API types array

DO $$ BEGIN
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cuisine_type text;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error adding cuisine_type column: %', SQLERRM;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN destinations.cuisine_type IS 'Cuisine type extracted from Google Places API types (e.g., italian_restaurant, mexican_restaurant)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_destinations_cuisine_type ON destinations(cuisine_type) WHERE cuisine_type IS NOT NULL;

