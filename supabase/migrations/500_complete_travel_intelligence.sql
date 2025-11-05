-- Migration 500: Complete Travel Intelligence Infrastructure
-- Adds all necessary tables for real-time intelligence, geolocation, and enhanced features

BEGIN;

-- ============================================================================
-- PART 1: GEOLOCATION & COORDINATES
-- ============================================================================

-- Add latitude/longitude to destinations if not present
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add spatial index for fast distance queries
CREATE INDEX IF NOT EXISTS idx_destinations_location
  ON destinations USING GIST (
    ll_to_earth(latitude, longitude)
  ) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Enable earthdistance extension for distance calculations
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- Function to calculate distance in kilometers
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN earth_distance(
    ll_to_earth(lat1, lon1),
    ll_to_earth(lat2, lon2)
  ) / 1000; -- Convert meters to kilometers
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find destinations within radius
CREATE OR REPLACE FUNCTION destinations_nearby(
  user_lat DECIMAL,
  user_lng DECIMAL,
  radius_km DECIMAL,
  result_limit INT DEFAULT 50
)
RETURNS TABLE (
  id INT,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  description TEXT,
  content TEXT,
  image TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  rating DECIMAL,
  price_level INT,
  michelin_stars INT,
  crown BOOLEAN,
  distance_km DECIMAL,
  distance_miles DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.slug,
    d.name,
    d.city,
    d.category,
    d.description,
    d.content,
    d.image,
    d.latitude,
    d.longitude,
    d.rating,
    d.price_level,
    d.michelin_stars,
    d.crown,
    calculate_distance_km(user_lat, user_lng, d.latitude, d.longitude) as distance_km,
    (calculate_distance_km(user_lat, user_lng, d.latitude, d.longitude) * 0.621371) as distance_miles
  FROM destinations d
  WHERE
    d.latitude IS NOT NULL
    AND d.longitude IS NOT NULL
    AND earth_box(ll_to_earth(user_lat, user_lng), radius_km * 1000) @> ll_to_earth(d.latitude, d.longitude)
    AND earth_distance(ll_to_earth(user_lat, user_lng), ll_to_earth(d.latitude, d.longitude)) <= radius_km * 1000
  ORDER BY distance_km ASC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 2: REAL-TIME INTELLIGENCE
-- ============================================================================

-- Real-time destination status
CREATE TABLE IF NOT EXISTS destination_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  status_type TEXT NOT NULL, -- 'crowding', 'wait_time', 'availability', 'special_hours'
  status_value JSONB NOT NULL,
  confidence_score FLOAT, -- 0.0-1.0
  data_source TEXT, -- 'google_places', 'manual', 'user_reported', 'predicted'
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_destination_status_lookup
  ON destination_status(destination_id, status_type, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_destination_status_expiry
  ON destination_status(expires_at) WHERE expires_at IS NOT NULL;

-- Crowding data by day/hour
CREATE TABLE IF NOT EXISTS crowding_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  day_of_week INT, -- 0=Sunday, 6=Saturday
  hour_of_day INT, -- 0-23
  crowding_level TEXT, -- 'quiet', 'moderate', 'busy', 'very_busy'
  crowding_score INT, -- 0-100
  sample_size INT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(destination_id, day_of_week, hour_of_day)
);

CREATE INDEX IF NOT EXISTS idx_crowding_lookup
  ON crowding_data(destination_id, day_of_week, hour_of_day);

-- Price alerts
CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  alert_type TEXT, -- 'price_drop', 'availability', 'new_hours', 'event_nearby'
  threshold_value JSONB,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_active
  ON price_alerts(user_id, is_active) WHERE is_active = true;

-- User-reported real-time updates
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  report_type TEXT, -- 'wait_time', 'crowding', 'closed', 'special_offer'
  report_data JSONB,
  verified BOOLEAN DEFAULT false,
  upvotes INT DEFAULT 0,
  downvotes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_reports_recent
  ON user_reports(destination_id, created_at DESC)
  WHERE verified = true AND expires_at > NOW();

-- ============================================================================
-- PART 3: ENGAGEMENT TRACKING
-- ============================================================================

-- Add engagement columns to destinations if not present
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visits_count INT DEFAULT 0;

-- Update saves_count from saved_places
UPDATE destinations d
SET saves_count = (
  SELECT COUNT(*)
  FROM saved_places sp
  WHERE sp.destination_slug = d.slug
)
WHERE saves_count = 0;

-- Update visits_count from visited_places
UPDATE destinations d
SET visits_count = (
  SELECT COUNT(*)
  FROM visited_places vp
  WHERE vp.destination_slug = d.slug
)
WHERE visits_count = 0;

-- Trigger to update saves_count
CREATE OR REPLACE FUNCTION update_destination_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE destinations
    SET saves_count = saves_count + 1
    WHERE slug = NEW.destination_slug;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE destinations
    SET saves_count = GREATEST(0, saves_count - 1)
    WHERE slug = OLD.destination_slug;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_saves_count ON saved_places;
CREATE TRIGGER trigger_update_saves_count
AFTER INSERT OR DELETE ON saved_places
FOR EACH ROW EXECUTE FUNCTION update_destination_saves_count();

-- Trigger to update visits_count
CREATE OR REPLACE FUNCTION update_destination_visits_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE destinations
    SET visits_count = visits_count + 1
    WHERE slug = NEW.destination_slug;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE destinations
    SET visits_count = GREATEST(0, visits_count - 1)
    WHERE slug = OLD.destination_slug;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_visits_count ON visited_places;
CREATE TRIGGER trigger_update_visits_count
AFTER INSERT OR DELETE ON visited_places
FOR EACH ROW EXECUTE FUNCTION update_destination_visits_count();

-- ============================================================================
-- PART 4: BOOKING & EXTERNAL LINKS
-- ============================================================================

-- Add booking-related columns to destinations
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS opentable_url TEXT,
  ADD COLUMN IF NOT EXISTS resy_url TEXT,
  ADD COLUMN IF NOT EXISTS booking_url TEXT,
  ADD COLUMN IF NOT EXISTS reservation_phone TEXT;

-- ============================================================================
-- PART 5: BEST TIME TO VISIT ANALYSIS
-- ============================================================================

-- Add columns for best time analysis
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS best_months TEXT[], -- ['May', 'June', 'September']
  ADD COLUMN IF NOT EXISTS peak_season TEXT, -- 'Summer', 'Winter', etc.
  ADD COLUMN IF NOT EXISTS avg_wait_time_minutes INT;

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE destination_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowding_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Public read access for status and crowding
CREATE POLICY "Public read access" ON destination_status FOR SELECT USING (true);
CREATE POLICY "Public read access" ON crowding_data FOR SELECT USING (true);

-- Users manage their own alerts
CREATE POLICY "Users manage own alerts" ON price_alerts FOR ALL USING (auth.uid() = user_id);

-- Users can read verified reports
CREATE POLICY "Public read verified reports" ON user_reports FOR SELECT USING (verified = true);

-- Users can create reports
CREATE POLICY "Users can create reports" ON user_reports FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports" ON user_reports FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- PART 7: HELPER VIEWS
-- ============================================================================

-- View for popular destinations
CREATE OR REPLACE VIEW popular_destinations AS
SELECT
  d.*,
  d.saves_count + d.visits_count as total_engagement
FROM destinations d
WHERE d.saves_count > 0 OR d.visits_count > 0
ORDER BY total_engagement DESC;

-- View for trending destinations (last 30 days)
CREATE OR REPLACE VIEW trending_destinations AS
SELECT
  d.*,
  COUNT(DISTINCT sp.user_id) as recent_saves,
  COUNT(DISTINCT vp.user_id) as recent_visits
FROM destinations d
LEFT JOIN saved_places sp ON sp.destination_slug = d.slug
  AND sp.saved_at > NOW() - INTERVAL '30 days'
LEFT JOIN visited_places vp ON vp.destination_slug = d.slug
  AND vp.visited_at > NOW() - INTERVAL '30 days'
GROUP BY d.id
HAVING COUNT(DISTINCT sp.user_id) > 0 OR COUNT(DISTINCT vp.user_id) > 0
ORDER BY (COUNT(DISTINCT sp.user_id) + COUNT(DISTINCT vp.user_id)) DESC;

COMMIT;
