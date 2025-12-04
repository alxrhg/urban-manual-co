-- Add source tracking to itinerary_items for visual hierarchy
-- curated = Urban Manual catalog (premium treatment)
-- google = Google Places (utility/fallback)
-- manual = User-created custom entries

-- Add source column
ALTER TABLE itinerary_items
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('curated', 'google', 'manual'));

-- Add google_place_id column
ALTER TABLE itinerary_items
ADD COLUMN IF NOT EXISTS google_place_id TEXT;

-- Backfill existing items based on destination_slug presence
-- Items with destination_slug are from Urban Manual catalog (curated)
UPDATE itinerary_items
SET source = 'curated'
WHERE destination_slug IS NOT NULL AND source = 'manual';

-- Create index for filtering by source
CREATE INDEX IF NOT EXISTS idx_itinerary_items_source ON itinerary_items(source);

-- Comment on columns
COMMENT ON COLUMN itinerary_items.source IS 'Source of the item: curated (Urban Manual catalog), google (Google Places), or manual (user-created)';
COMMENT ON COLUMN itinerary_items.google_place_id IS 'Google Places ID if the item was added from Google search';
