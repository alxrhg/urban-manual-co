-- Migration 407: Add Editorial Summary and Extended Google Enrichment Fields
-- Add extended Google enrichment fields to destinations (idempotent)

DO $$ BEGIN
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS current_opening_hours_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS secondary_opening_hours_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS business_status text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS editorial_summary text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS google_name text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS place_types_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS utc_offset int;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS vicinity text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS adr_address text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS address_components_json jsonb;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS icon_url text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS icon_background_color text;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS icon_mask_base_uri text;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN destinations.editorial_summary IS 'Editorial summary from Google Places API';
COMMENT ON COLUMN destinations.google_name IS 'Official name from Google Places';
COMMENT ON COLUMN destinations.business_status IS 'Business operational status from Google';
COMMENT ON COLUMN destinations.current_opening_hours_json IS 'Current opening hours from Google Places';
COMMENT ON COLUMN destinations.secondary_opening_hours_json IS 'Secondary opening hours (e.g., delivery hours)';
COMMENT ON COLUMN destinations.place_types_json IS 'Place types array from Google Places';
