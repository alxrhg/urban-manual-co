-- Migration 600: Algorithmic Feed Infrastructure
-- Adds tables and functions for TikTok-style personalized feed
-- Author: Claude
-- Date: November 5, 2025

BEGIN;

-- ============================================================================
-- PART 1: USER SIGNALS TRACKING
-- ============================================================================

-- Track ALL user interactions with destinations
CREATE TABLE IF NOT EXISTS user_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,

  -- Signal type and value
  signal_type TEXT NOT NULL, -- 'view', 'dwell', 'hover', 'click', 'save', 'skip', 'visit_marked', 'share', 'zoom_image', 'read_details'
  signal_value FLOAT NOT NULL, -- Strength 0.0-1.5 (can be negative for skip)

  -- Context
  position_in_feed INT, -- Where in feed this appeared
  session_id UUID, -- Session tracking
  time_of_day INT, -- Hour 0-23
  device TEXT, -- 'mobile', 'desktop', 'tablet'
  previous_card_id INT, -- Previous destination viewed
  dwell_seconds INT, -- How long they viewed (for dwell signals)

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_signals_user
  ON user_signals(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_signals_destination
  ON user_signals(destination_id, signal_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_signals_session
  ON user_signals(session_id, position_in_feed);

-- Partition by month for performance (optional, for scale)
-- CREATE INDEX IF NOT EXISTS idx_user_signals_date
--   ON user_signals(created_at) WHERE created_at > NOW() - INTERVAL '90 days';

-- ============================================================================
-- PART 2: USER PROFILES (LEARNED PREFERENCES)
-- ============================================================================

-- Store learned user preferences from signals
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Learned preferences (JSONB for flexibility)
  preferred_categories JSONB DEFAULT '{}'::jsonb, -- { "Dining": 0.85, "Bar": 0.72 }
  preferred_cities JSONB DEFAULT '{}'::jsonb, -- { "Tokyo": 0.90, "Paris": 0.75 }
  preferred_price_range JSONB DEFAULT '{"min": 1, "max": 4}'::jsonb, -- { min: 1, max: 4 }
  preferred_tags JSONB DEFAULT '{}'::jsonb, -- { "michelin": 0.88, "intimate": 0.65 }

  -- Behavioral patterns
  avg_session_length_seconds INT DEFAULT 180,
  peak_activity_hours INT[] DEFAULT ARRAY[12,18,19,20], -- Hours when most active
  scroll_velocity FLOAT DEFAULT 1.0, -- Fast vs slow browser
  skip_rate FLOAT DEFAULT 0.3, -- How picky (0-1)

  -- Engagement metrics
  total_views INT DEFAULT 0,
  total_saves INT DEFAULT 0,
  total_skips INT DEFAULT 0,
  total_visits INT DEFAULT 0,
  engagement_score FLOAT DEFAULT 0.5, -- Overall activity (0-1)

  -- Diversity preferences
  exploration_vs_exploitation FLOAT DEFAULT 0.6, -- 0=conservative, 1=adventurous

  -- Profile metadata
  profile_confidence FLOAT DEFAULT 0.0, -- 0-1, higher with more data
  profile_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Onboarding data
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_data JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_updated
  ON user_profiles(profile_updated_at DESC);

-- ============================================================================
-- PART 3: FEED CACHE
-- ============================================================================

-- Cache generated feeds for performance
CREATE TABLE IF NOT EXISTS feed_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cached feed data
  feed_items JSONB NOT NULL, -- Array of { destination_id, score, reason, position }
  feed_type TEXT DEFAULT 'for_you', -- 'for_you', 'following', 'explore'

  -- Cache metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  profile_version INT, -- Invalidate if profile changes

  -- Stats
  items_count INT,
  generation_time_ms INT
);

CREATE INDEX IF NOT EXISTS idx_feed_cache_lookup
  ON feed_cache(user_id, feed_type, expires_at DESC)
  WHERE expires_at > NOW();

-- Auto-cleanup expired caches
CREATE INDEX IF NOT EXISTS idx_feed_cache_cleanup
  ON feed_cache(expires_at) WHERE expires_at < NOW();

-- ============================================================================
-- PART 4: RECENTLY VIEWED TRACKING
-- ============================================================================

-- Track recently viewed destinations to avoid repetition
CREATE TABLE IF NOT EXISTS recently_viewed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID,

  UNIQUE(user_id, destination_id)
);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user
  ON recently_viewed(user_id, viewed_at DESC);

-- Clean up old views (keep last 30 days)
CREATE INDEX IF NOT EXISTS idx_recently_viewed_cleanup
  ON recently_viewed(viewed_at) WHERE viewed_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to update user profile from signal
CREATE OR REPLACE FUNCTION update_user_profile_from_signal()
RETURNS TRIGGER AS $$
DECLARE
  dest_record RECORD;
  current_profile RECORD;
  weight FLOAT;
BEGIN
  -- Get destination details
  SELECT * INTO dest_record
  FROM destinations
  WHERE id = NEW.destination_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Get current profile (create if doesn't exist)
  INSERT INTO user_profiles (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO current_profile
  FROM user_profiles
  WHERE user_id = NEW.user_id;

  -- Determine weight from signal type
  weight := CASE NEW.signal_type
    WHEN 'view' THEN 0.1
    WHEN 'dwell' THEN LEAST(0.6, NEW.dwell_seconds * 0.06) -- 0.06 per second, max 0.6
    WHEN 'hover' THEN 0.3
    WHEN 'click' THEN 0.5
    WHEN 'save' THEN 1.0
    WHEN 'skip' THEN -0.5
    WHEN 'visit_marked' THEN 1.5
    WHEN 'share' THEN 1.2
    WHEN 'zoom_image' THEN 0.4
    WHEN 'read_details' THEN 0.5
    ELSE 0.1
  END;

  -- Update profile with incremental learning
  -- This is simplified - in production, use more sophisticated algorithms
  UPDATE user_profiles
  SET
    -- Update category preferences
    preferred_categories = CASE
      WHEN dest_record.category IS NOT NULL THEN
        jsonb_set(
          preferred_categories,
          ARRAY[dest_record.category],
          to_jsonb(LEAST(1.0, GREATEST(0.0,
            COALESCE((preferred_categories->>dest_record.category)::float, 0.5) + (weight * 0.1)
          )))
        )
      ELSE preferred_categories
    END,

    -- Update city preferences
    preferred_cities = CASE
      WHEN dest_record.city IS NOT NULL THEN
        jsonb_set(
          preferred_cities,
          ARRAY[dest_record.city],
          to_jsonb(LEAST(1.0, GREATEST(0.0,
            COALESCE((preferred_cities->>dest_record.city)::float, 0.5) + (weight * 0.1)
          )))
        )
      ELSE preferred_cities
    END,

    -- Update counters
    total_views = CASE WHEN NEW.signal_type = 'view' THEN total_views + 1 ELSE total_views END,
    total_saves = CASE WHEN NEW.signal_type = 'save' THEN total_saves + 1 ELSE total_saves END,
    total_skips = CASE WHEN NEW.signal_type = 'skip' THEN total_skips + 1 ELSE total_skips END,

    -- Update profile confidence (more signals = higher confidence)
    profile_confidence = LEAST(1.0, (total_views + 1)::float / 100.0),

    -- Update timestamp
    profile_updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile on new signal
DROP TRIGGER IF EXISTS trigger_update_profile_from_signal ON user_signals;
CREATE TRIGGER trigger_update_profile_from_signal
AFTER INSERT ON user_signals
FOR EACH ROW EXECUTE FUNCTION update_user_profile_from_signal();

-- Function to get feed candidates for user
CREATE OR REPLACE FUNCTION get_feed_candidates(
  p_user_id UUID,
  p_limit INT DEFAULT 200,
  p_exclude_recent_days INT DEFAULT 7
)
RETURNS TABLE (
  id INT,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  description TEXT,
  image TEXT,
  rating DECIMAL,
  price_level INT,
  michelin_stars INT,
  crown BOOLEAN,
  saves_count INT,
  visits_count INT,
  tags TEXT[]
) AS $$
DECLARE
  profile RECORD;
  top_cities TEXT[];
  top_categories TEXT[];
BEGIN
  -- Get user profile
  SELECT * INTO profile
  FROM user_profiles
  WHERE user_id = p_user_id;

  -- If no profile, return random high-quality destinations
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      d.id, d.slug, d.name, d.city, d.category, d.description, d.image,
      d.rating, d.price_level, d.michelin_stars, d.crown,
      d.saves_count, d.visits_count, d.tags
    FROM destinations d
    WHERE d.rating >= 4.0
    ORDER BY RANDOM()
    LIMIT p_limit;
    RETURN;
  END IF;

  -- Extract top preferred cities and categories
  SELECT ARRAY(
    SELECT key
    FROM jsonb_each_text(profile.preferred_cities)
    ORDER BY value::float DESC
    LIMIT 3
  ) INTO top_cities;

  SELECT ARRAY(
    SELECT key
    FROM jsonb_each_text(profile.preferred_categories)
    ORDER BY value::float DESC
    LIMIT 3
  ) INTO top_categories;

  -- Return candidates excluding recently viewed
  RETURN QUERY
  SELECT
    d.id, d.slug, d.name, d.city, d.category, d.description, d.image,
    d.rating, d.price_level, d.michelin_stars, d.crown,
    d.saves_count, d.visits_count, d.tags
  FROM destinations d
  WHERE
    -- Exclude recently viewed
    d.id NOT IN (
      SELECT destination_id
      FROM recently_viewed
      WHERE user_id = p_user_id
        AND viewed_at > NOW() - (p_exclude_recent_days || ' days')::INTERVAL
    )
    -- Exclude already saved
    AND d.slug NOT IN (
      SELECT destination_slug
      FROM saved_places
      WHERE user_id = p_user_id
    )
    -- Exclude already visited
    AND d.slug NOT IN (
      SELECT destination_slug
      FROM visited_places
      WHERE user_id = p_user_id
    )
    -- Prefer top cities (80% probability)
    AND (
      CASE WHEN RANDOM() < 0.8 AND ARRAY_LENGTH(top_cities, 1) > 0
        THEN d.city = ANY(top_cities)
        ELSE TRUE
      END
    )
    -- Prefer top categories (70% probability)
    AND (
      CASE WHEN RANDOM() < 0.7 AND ARRAY_LENGTH(top_categories, 1) > 0
        THEN d.category = ANY(top_categories)
        ELSE TRUE
      END
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_viewed ENABLE ROW LEVEL SECURITY;

-- Users can only see/manage their own data
CREATE POLICY "Users manage own signals" ON user_signals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own profile" ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own cache" ON feed_cache FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own views" ON recently_viewed FOR ALL USING (auth.uid() = user_id);

-- Service role can read all (for analytics)
CREATE POLICY "Service role full access signals" ON user_signals FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access profiles" ON user_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access cache" ON feed_cache FOR ALL TO service_role USING (true);

-- ============================================================================
-- PART 7: CLEANUP FUNCTIONS
-- ============================================================================

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_feed_data()
RETURNS void AS $$
BEGIN
  -- Delete old signals (keep 90 days)
  DELETE FROM user_signals
  WHERE created_at < NOW() - INTERVAL '90 days';

  -- Delete expired feed caches
  DELETE FROM feed_cache
  WHERE expires_at < NOW();

  -- Delete old recently viewed (keep 30 days)
  DELETE FROM recently_viewed
  WHERE viewed_at < NOW() - INTERVAL '30 days';

  -- Vacuum tables
  VACUUM ANALYZE user_signals;
  VACUUM ANALYZE feed_cache;
  VACUUM ANALYZE recently_viewed;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 8: INITIAL DATA
-- ============================================================================

-- Create profiles for existing users (optional)
INSERT INTO user_profiles (user_id, onboarding_completed)
SELECT id, false
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================

-- To use this migration:
-- 1. Run: psql <connection_string> -f supabase/migrations/600_algorithmic_feed.sql
-- 2. Or use Supabase CLI: supabase db push
--
-- To clean up old data periodically, set up a cron job:
-- SELECT cron.schedule('cleanup-feed-data', '0 2 * * *', 'SELECT cleanup_feed_data()');
