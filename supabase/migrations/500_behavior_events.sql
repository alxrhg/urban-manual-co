-- Migration 500: Behavior Events for Algorithm Training
-- Stores raw behavior events to feed TasteDNA and other algorithms

BEGIN;

-- ============================================================================
-- BEHAVIOR EVENTS TABLE
-- Raw events from frontend tracking for algorithm training
-- ============================================================================

CREATE TABLE IF NOT EXISTS behavior_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User (nullable for anonymous)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL,
  destination_slug TEXT,
  destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,

  -- Rich context (JSON blob)
  event_context JSONB DEFAULT '{}',

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Processing state
  processed_at TIMESTAMPTZ,
  processed_by TEXT  -- Which algorithm processed it
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_behavior_events_user
  ON behavior_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_behavior_events_type
  ON behavior_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_behavior_events_destination
  ON behavior_events(destination_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_behavior_events_unprocessed
  ON behavior_events(created_at DESC)
  WHERE processed_at IS NULL;

-- Partial index for algorithm training queries
CREATE INDEX IF NOT EXISTS idx_behavior_events_training
  ON behavior_events(user_id, event_type, created_at DESC)
  WHERE user_id IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
DROP POLICY IF EXISTS "Users see own behavior events" ON behavior_events;
CREATE POLICY "Users see own behavior events" ON behavior_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can do everything (for algorithms)
DROP POLICY IF EXISTS "Service role full access" ON behavior_events;
CREATE POLICY "Service role full access" ON behavior_events
  FOR ALL USING (auth.role() = 'service_role');

-- Anonymous inserts allowed (for tracking before login)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON behavior_events;
CREATE POLICY "Allow anonymous inserts" ON behavior_events
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get user behavior summary for TasteDNA
CREATE OR REPLACE FUNCTION get_user_behavior_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 90
)
RETURNS TABLE (
  event_type TEXT,
  count BIGINT,
  unique_destinations BIGINT,
  avg_engagement FLOAT,
  last_event TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    be.event_type,
    COUNT(*)::BIGINT as count,
    COUNT(DISTINCT be.destination_slug)::BIGINT as unique_destinations,
    COALESCE(AVG((be.event_context->>'engagement_score')::FLOAT), 0) as avg_engagement,
    MAX(be.created_at) as last_event
  FROM behavior_events be
  WHERE be.user_id = p_user_id
    AND be.created_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY be.event_type
  ORDER BY count DESC;
END;
$$;

-- Get destination popularity signals
CREATE OR REPLACE FUNCTION get_destination_behavior_stats(
  p_destination_slug TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  views BIGINT,
  clicks BIGINT,
  saves BIGINT,
  avg_dwell_time_ms FLOAT,
  avg_scroll_depth FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE be.event_type = 'destination_view')::BIGINT as views,
    COUNT(*) FILTER (WHERE be.event_type = 'destination_click')::BIGINT as clicks,
    COUNT(*) FILTER (WHERE be.event_type = 'destination_save')::BIGINT as saves,
    AVG((be.event_context->>'dwell_time_ms')::FLOAT) as avg_dwell_time_ms,
    AVG((be.event_context->>'max_scroll_depth')::FLOAT) as avg_scroll_depth
  FROM behavior_events be
  WHERE be.destination_slug = p_destination_slug
    AND be.created_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

-- Mark events as processed by an algorithm
CREATE OR REPLACE FUNCTION mark_events_processed(
  p_event_ids UUID[],
  p_algorithm TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE behavior_events
  SET
    processed_at = NOW(),
    processed_by = p_algorithm
  WHERE id = ANY(p_event_ids)
    AND processed_at IS NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ============================================================================
-- AGGREGATION TABLE FOR ALGORITHM TRAINING
-- Pre-computed user behavior features (refreshed periodically)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_behavior_features (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Interaction counts
  total_views INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,

  -- Engagement metrics
  avg_dwell_time_ms FLOAT DEFAULT 0,
  avg_scroll_depth FLOAT DEFAULT 0,
  unique_destinations_viewed INTEGER DEFAULT 0,
  unique_cities_explored INTEGER DEFAULT 0,

  -- Category distribution (JSONB)
  category_distribution JSONB DEFAULT '{}',

  -- Time patterns (JSONB)
  time_of_day_distribution JSONB DEFAULT '{}',
  day_of_week_distribution JSONB DEFAULT '{}',

  -- Price preferences
  avg_price_level FLOAT,
  price_level_variance FLOAT,

  -- Computed taste signals
  design_affinity FLOAT DEFAULT 0,
  michelin_affinity FLOAT DEFAULT 0,
  adventurousness FLOAT DEFAULT 0.5,

  -- Metadata
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  events_processed INTEGER DEFAULT 0
);

-- Function to refresh user behavior features
CREATE OR REPLACE FUNCTION refresh_user_behavior_features(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_dist JSONB;
  v_time_dist JSONB;
  v_day_dist JSONB;
  v_stats RECORD;
BEGIN
  -- Calculate category distribution
  SELECT jsonb_object_agg(category, cnt)
  INTO v_category_dist
  FROM (
    SELECT
      COALESCE(d.category, 'unknown') as category,
      COUNT(*)::INTEGER as cnt
    FROM behavior_events be
    JOIN destinations d ON d.slug = be.destination_slug
    WHERE be.user_id = p_user_id
      AND be.event_type IN ('destination_view', 'destination_click', 'destination_save')
    GROUP BY d.category
  ) sub;

  -- Calculate time of day distribution
  SELECT jsonb_object_agg(time_of_day, cnt)
  INTO v_time_dist
  FROM (
    SELECT
      COALESCE(be.event_context->>'time_of_day', 'unknown') as time_of_day,
      COUNT(*)::INTEGER as cnt
    FROM behavior_events be
    WHERE be.user_id = p_user_id
    GROUP BY be.event_context->>'time_of_day'
  ) sub;

  -- Calculate day of week distribution
  SELECT jsonb_object_agg(day_of_week, cnt)
  INTO v_day_dist
  FROM (
    SELECT
      COALESCE((be.event_context->>'day_of_week')::TEXT, '-1') as day_of_week,
      COUNT(*)::INTEGER as cnt
    FROM behavior_events be
    WHERE be.user_id = p_user_id
    GROUP BY be.event_context->>'day_of_week'
  ) sub;

  -- Calculate aggregate stats
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'destination_view') as views,
    COUNT(*) FILTER (WHERE event_type = 'destination_click') as clicks,
    COUNT(*) FILTER (WHERE event_type = 'destination_save') as saves,
    COUNT(*) FILTER (WHERE event_type = 'search_query') as searches,
    AVG((event_context->>'dwell_time_ms')::FLOAT) as avg_dwell,
    AVG((event_context->>'max_scroll_depth')::FLOAT) as avg_scroll,
    COUNT(DISTINCT destination_slug) as unique_dests
  INTO v_stats
  FROM behavior_events
  WHERE user_id = p_user_id;

  -- Upsert features
  INSERT INTO user_behavior_features (
    user_id,
    total_views,
    total_clicks,
    total_saves,
    total_searches,
    avg_dwell_time_ms,
    avg_scroll_depth,
    unique_destinations_viewed,
    category_distribution,
    time_of_day_distribution,
    day_of_week_distribution,
    last_computed_at,
    events_processed
  )
  VALUES (
    p_user_id,
    COALESCE(v_stats.views, 0),
    COALESCE(v_stats.clicks, 0),
    COALESCE(v_stats.saves, 0),
    COALESCE(v_stats.searches, 0),
    COALESCE(v_stats.avg_dwell, 0),
    COALESCE(v_stats.avg_scroll, 0),
    COALESCE(v_stats.unique_dests, 0),
    COALESCE(v_category_dist, '{}'),
    COALESCE(v_time_dist, '{}'),
    COALESCE(v_day_dist, '{}'),
    NOW(),
    v_stats.views + v_stats.clicks + v_stats.saves + v_stats.searches
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_views = EXCLUDED.total_views,
    total_clicks = EXCLUDED.total_clicks,
    total_saves = EXCLUDED.total_saves,
    total_searches = EXCLUDED.total_searches,
    avg_dwell_time_ms = EXCLUDED.avg_dwell_time_ms,
    avg_scroll_depth = EXCLUDED.avg_scroll_depth,
    unique_destinations_viewed = EXCLUDED.unique_destinations_viewed,
    category_distribution = EXCLUDED.category_distribution,
    time_of_day_distribution = EXCLUDED.time_of_day_distribution,
    day_of_week_distribution = EXCLUDED.day_of_week_distribution,
    last_computed_at = EXCLUDED.last_computed_at,
    events_processed = EXCLUDED.events_processed;
END;
$$;

-- RLS for user_behavior_features
ALTER TABLE user_behavior_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own features" ON user_behavior_features;
CREATE POLICY "Users see own features" ON user_behavior_features
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access features" ON user_behavior_features;
CREATE POLICY "Service role full access features" ON user_behavior_features
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;
