-- Migration 404: Visited Places Enhancements
-- Photos, better notes, trip associations

-- Visited place photos table
CREATE TABLE IF NOT EXISTS visited_place_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_slug TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT false, -- Main photo for this visit
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip groupings (group multiple visits into a trip)
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  city TEXT,
  country TEXT,
  cover_photo_url TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link visited places to trips
ALTER TABLE visited_places ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;

-- Enhance visited_places with more metadata
ALTER TABLE visited_places ADD COLUMN IF NOT EXISTS would_recommend BOOLEAN DEFAULT true;
ALTER TABLE visited_places ADD COLUMN IF NOT EXISTS price_paid DECIMAL(10, 2); -- How much they spent
ALTER TABLE visited_places ADD COLUMN IF NOT EXISTS visit_duration INTEGER; -- Minutes spent at place
ALTER TABLE visited_places ADD COLUMN IF NOT EXISTS weather TEXT; -- Weather during visit
ALTER TABLE visited_places ADD COLUMN IF NOT EXISTS companions TEXT; -- Who they were with
ALTER TABLE visited_places ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Custom tags

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visited_place_photos_user ON visited_place_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_visited_place_photos_destination ON visited_place_photos(destination_slug);
CREATE INDEX IF NOT EXISTS idx_visited_place_photos_primary ON visited_place_photos(user_id, destination_slug, is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON trips(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trips_public ON trips(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_visited_places_trip ON visited_places(trip_id) WHERE trip_id IS NOT NULL;

-- RLS policies
ALTER TABLE visited_place_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Photos: Users can view their own photos
CREATE POLICY visited_place_photos_select_own ON visited_place_photos
  FOR SELECT
  USING (auth.uid() = user_id);

-- Photos: Users can view photos from public profiles
CREATE POLICY visited_place_photos_select_public ON visited_place_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = visited_place_photos.user_id
      AND user_profiles.is_public = true
    )
  );

-- Photos: Users can insert their own photos
CREATE POLICY visited_place_photos_insert_own ON visited_place_photos
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Photos: Users can update their own photos
CREATE POLICY visited_place_photos_update_own ON visited_place_photos
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Photos: Users can delete their own photos
CREATE POLICY visited_place_photos_delete_own ON visited_place_photos
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trips: Users can view their own trips
CREATE POLICY trips_select_own ON trips
  FOR SELECT
  USING (auth.uid() = user_id);

-- Trips: Users can view public trips
CREATE POLICY trips_select_public ON trips
  FOR SELECT
  USING (is_public = true);

-- Trips: Users can insert their own trips
CREATE POLICY trips_insert_own ON trips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trips: Users can update their own trips
CREATE POLICY trips_update_own ON trips
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trips: Users can delete their own trips
CREATE POLICY trips_delete_own ON trips
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one primary photo per user per destination
CREATE OR REPLACE FUNCTION ensure_single_primary_photo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    -- Unset any existing primary photos for this user and destination
    UPDATE visited_place_photos
    SET is_primary = false
    WHERE user_id = NEW.user_id
    AND destination_slug = NEW.destination_slug
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single primary photo
DROP TRIGGER IF EXISTS ensure_single_primary_photo_trigger ON visited_place_photos;
CREATE TRIGGER ensure_single_primary_photo_trigger
  BEFORE INSERT OR UPDATE OF is_primary ON visited_place_photos
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION ensure_single_primary_photo();

-- Grant permissions
GRANT ALL ON visited_place_photos TO authenticated;
GRANT ALL ON trips TO authenticated;

COMMENT ON TABLE visited_place_photos IS 'User photos of visited places';
COMMENT ON TABLE trips IS 'Group multiple visits into a trip';
