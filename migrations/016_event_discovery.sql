-- ================================================
-- Phase 8: Event Discovery Pipeline
-- ================================================
-- Discovers and recommends events near destinations
-- ================================================

-- ================================================
-- Events Table
-- ================================================

CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'music', 'food', 'art', 'sports', etc.
  
  -- Location
  city VARCHAR(255) NOT NULL,
  venue_name VARCHAR(500),
  address TEXT,
  latitude FLOAT,
  longitude FLOAT,
  
  -- Timing
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(50), -- 'daily', 'weekly', 'monthly'
  
  -- Details
  price_min FLOAT,
  price_max FLOAT,
  is_free BOOLEAN DEFAULT false,
  capacity INT,
  booking_url TEXT,
  
  -- Tags
  tags TEXT[],
  
  -- Source
  source VARCHAR(100) DEFAULT 'manual', -- 'manual', 'ticketmaster', 'eventbrite', etc.
  external_id VARCHAR(255),
  
  -- Status
  status VARCHAR(50) DEFAULT 'published', -- 'draft', 'published', 'cancelled'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_city ON events(city);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);

-- ================================================
-- Event-Destination Associations
-- ================================================

CREATE TABLE IF NOT EXISTS event_destination_associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  
  -- Relevance
  relevance_score FLOAT DEFAULT 0.5, -- 0-1
  reason TEXT,
  
  -- Distance
  distance_km FLOAT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, destination_id)
);

CREATE INDEX idx_event_dest_assoc_event ON event_destination_associations(event_id);
CREATE INDEX idx_event_dest_assoc_destination ON event_destination_associations(destination_id);

-- ================================================
-- User Event Interests
-- ================================================

CREATE TABLE IF NOT EXISTS user_event_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  
  -- Interest level
  interest_level VARCHAR(50), -- 'interested', 'going', 'not_interested'
  
  -- Reminders
  reminder_sent BOOLEAN DEFAULT false,
  reminder_time TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, event_id)
);

CREATE INDEX idx_user_event_interests_user ON user_event_interests(user_id);
CREATE INDEX idx_user_event_interests_event ON user_event_interests(event_id);

-- ================================================
-- Helper Functions
-- ================================================

-- Get upcoming events for a city
CREATE OR REPLACE FUNCTION get_upcoming_events_for_city(
  city_name VARCHAR(255),
  days_ahead INT DEFAULT 30,
  limit_count INT DEFAULT 20
)
RETURNS TABLE(
  event_id INT,
  event_name VARCHAR(500),
  start_time TIMESTAMP WITH TIME ZONE,
  category VARCHAR(100),
  is_free BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.name,
    e.start_time,
    e.category,
    e.is_free
  FROM events e
  WHERE e.city = city_name
    AND e.status = 'published'
    AND e.start_time >= NOW()
    AND e.start_time <= NOW() + (days_ahead || ' days')::INTERVAL
  ORDER BY e.start_time ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_destination_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_event_interests ENABLE ROW LEVEL SECURITY;

-- Public read for published events
CREATE POLICY "Published events are public" ON events
  FOR SELECT USING (status = 'published');

-- Public read for event associations
CREATE POLICY "Event associations are public" ON event_destination_associations
  FOR SELECT USING (true);

-- Users can read/write their own event interests
CREATE POLICY "Users can read own event interests" ON user_event_interests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own event interests" ON user_event_interests
  FOR ALL USING (auth.uid() = user_id);

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE events IS 'Events happening in cities';
COMMENT ON TABLE event_destination_associations IS 'Links events to nearby destinations';
COMMENT ON TABLE user_event_interests IS 'User interest in events';
