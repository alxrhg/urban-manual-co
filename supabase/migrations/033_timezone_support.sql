-- Migration: Enhanced Time Support with Timezones
-- Adds proper timezone support to itinerary items

-- Add new time columns to itinerary_items
ALTER TABLE itinerary_items 
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(100);

-- Create index for time-based queries
CREATE INDEX IF NOT EXISTS idx_itinerary_items_start_time ON itinerary_items(start_time);

-- Migrate existing time data (approximate conversion)
-- This converts the VARCHAR time to a proper timestamp on the current date
-- Users will need to update these with actual dates/times
UPDATE itinerary_items 
SET start_time = CASE 
  WHEN time IS NOT NULL AND time != '' THEN 
    (CURRENT_DATE || ' ' || time)::TIMESTAMPTZ
  ELSE NULL
END
WHERE start_time IS NULL AND time IS NOT NULL;

-- Note: We're keeping the old 'time' field for backwards compatibility
-- It can be removed in a future migration once all components are updated
-- To remove: ALTER TABLE itinerary_items DROP COLUMN time;
