-- Migration: Add intent fields to saved_places for trip bridge functionality
-- This enables the connection between browsing/saving and trip planning

-- Add new columns to saved_places
ALTER TABLE saved_places
ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS intent VARCHAR(20) DEFAULT 'general' CHECK (intent IN ('for_trip', 'someday', 'general')),
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS source_city VARCHAR(255);

-- Create index for trip-based queries
CREATE INDEX IF NOT EXISTS idx_saved_places_trip_id ON saved_places(trip_id);
CREATE INDEX IF NOT EXISTS idx_saved_places_intent ON saved_places(intent);
CREATE INDEX IF NOT EXISTS idx_saved_places_source_city ON saved_places(source_city);

-- Add RLS policy for updating saved places
CREATE POLICY IF NOT EXISTS "Users can update their saved places"
  ON saved_places FOR UPDATE
  USING (auth.uid() = user_id);

-- Comment explaining the fields
COMMENT ON COLUMN saved_places.trip_id IS 'Optional link to a specific trip this save is intended for';
COMMENT ON COLUMN saved_places.intent IS 'User intent: for_trip (specific trip), someday (wishlist), general (no specific plan)';
COMMENT ON COLUMN saved_places.note IS 'Optional user note about why they saved this (e.g., "anniversary dinner")';
COMMENT ON COLUMN saved_places.source_city IS 'City context where the destination was saved from (inferred from destination)';
