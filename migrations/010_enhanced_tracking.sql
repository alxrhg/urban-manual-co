-- Migration: Enhanced Tracking System (Phase 1)
-- Adds granular behavioral tracking with 50+ signals
-- Run this in your Supabase SQL Editor

-- ============================================
-- 1. USER SESSIONS (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Session metadata
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,

  -- Device & Context
  device_type TEXT, -- 'desktop', 'tablet', 'mobile'
  browser TEXT,
  os TEXT,
  viewport_width INT,
  viewport_height INT,

  -- Location (if available)
  country TEXT,
  city TEXT,
  timezone TEXT,

  -- Referral
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Network
  connection_type TEXT, -- '4g', 'wifi', etc.

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_started_at ON user_sessions(started_at DESC);

-- ============================================
-- 2. ENRICHED INTERACTIONS (50+ Signals)
-- ============================================
CREATE TABLE IF NOT EXISTS enriched_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES user_sessions(id) ON DELETE SET NULL,

  -- Mouse & Cursor Behavior
  hover_duration_ms INT, -- Total time hovering over card/element
  hover_count INT, -- Number of hover events
  cursor_path_complexity FLOAT, -- Bezier curve complexity (0-1)
  click_hesitation_ms INT, -- Time between hover start and click

  -- Scroll Behavior
  scroll_depth_percentage INT CHECK (scroll_depth_percentage >= 0 AND scroll_depth_percentage <= 100),
  max_scroll_depth INT, -- Max % reached
  scroll_velocity_avg FLOAT, -- Pixels per second
  scroll_direction_changes INT, -- Number of times user scrolled up/down
  time_to_first_scroll_ms INT, -- Time until user started scrolling

  -- Dwell Time & Engagement
  dwell_time_ms INT NOT NULL, -- Total time on page
  active_time_ms INT, -- Time actively engaged (not idle)
  engagement_score FLOAT CHECK (engagement_score >= 0.0 AND engagement_score <= 1.0), -- Calculated engagement (0-1)
  tab_switches INT, -- How many times user left/returned to tab
  idle_time_ms INT, -- Time spent idle

  -- Content Interaction
  images_viewed JSONB, -- Array of image URLs viewed
  image_interactions INT, -- Zooms, clicks on images
  text_selections INT, -- Number of text selections
  text_copied BOOLEAN DEFAULT false,
  video_played BOOLEAN DEFAULT false,
  video_watch_duration_ms INT,

  -- Navigation Behavior
  back_button_used BOOLEAN DEFAULT false,
  external_link_hovers INT, -- Hovering over external links
  share_button_hovers INT,
  save_button_hovers INT,
  booking_link_clicks INT,

  -- Reading Behavior
  reading_speed_wpm FLOAT, -- Estimated words per minute
  content_consumed_percentage FLOAT, -- % of content actually viewed

  -- Interaction Patterns
  click_count INT DEFAULT 0,
  double_click_count INT DEFAULT 0,
  right_click_count INT DEFAULT 0,

  -- Context
  viewport_width INT,
  viewport_height INT,
  device_orientation TEXT, -- 'portrait', 'landscape'
  battery_level INT, -- If available via Battery API
  connection_type TEXT,

  -- Source & Attribution
  source TEXT, -- 'recommendation', 'search', 'trending', 'category'
  referrer_page TEXT,
  search_query TEXT,
  position_in_list INT, -- Position if from a list

  -- Metadata (flexible JSONB for future signals)
  metadata JSONB,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_enriched_interactions_user_id ON enriched_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_enriched_interactions_destination_id ON enriched_interactions(destination_id);
CREATE INDEX IF NOT EXISTS idx_enriched_interactions_session_id ON enriched_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_enriched_interactions_engagement_score ON enriched_interactions(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_interactions_created_at ON enriched_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enriched_interactions_user_dest ON enriched_interactions(user_id, destination_id);

-- ============================================
-- 3. INTERACTION FEATURES (Aggregated View)
-- ============================================
-- Materialized view for ML training - aggregates per user
CREATE MATERIALIZED VIEW IF NOT EXISTS interaction_features AS
SELECT
  user_id,

  -- Aggregated metrics (last 30 days)
  AVG(hover_duration_ms) as avg_hover_duration,
  AVG(scroll_depth_percentage) as avg_scroll_depth,
  AVG(dwell_time_ms) as avg_dwell_time,
  AVG(engagement_score) as avg_engagement_score,
  AVG(active_time_ms::FLOAT / NULLIF(dwell_time_ms, 0)) as active_time_ratio,

  -- Behavioral patterns
  AVG(dwell_time_ms) / NULLIF(COUNT(*), 0) as browsing_speed, -- Fast vs slow browser
  COUNT(DISTINCT destination_id)::FLOAT / NULLIF(COUNT(*), 0) as exploration_vs_focused, -- Many vs few items
  AVG(image_interactions) as visual_engagement,
  AVG(text_selections) as detail_reading_engagement,

  -- Counts
  COUNT(*) as total_interactions,
  COUNT(DISTINCT destination_id) as unique_destinations,
  COUNT(DISTINCT session_id) as total_sessions,

  -- Timestamps
  MAX(created_at) as last_interaction_at,
  NOW() as last_updated

FROM enriched_interactions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_interaction_features_user_id ON interaction_features(user_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_interaction_features()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY interaction_features;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. EVENT QUEUE (for batched processing)
-- ============================================
CREATE TABLE IF NOT EXISTS tracking_event_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event data
  events JSONB NOT NULL, -- Array of tracking events
  event_count INT NOT NULL,

  -- Processing status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- Metadata
  client_timestamp BIGINT, -- Unix timestamp from client
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_event_queue_status ON tracking_event_queue(status);
CREATE INDEX IF NOT EXISTS idx_tracking_event_queue_created_at ON tracking_event_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_event_queue_user_id ON tracking_event_queue(user_id);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enriched_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_event_queue ENABLE ROW LEVEL SECURITY;

-- User Sessions Policies
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert sessions" ON user_sessions;
CREATE POLICY "Users can insert sessions" ON user_sessions
  FOR INSERT WITH CHECK (true); -- Allow anonymous session creation

DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Enriched Interactions Policies
DROP POLICY IF EXISTS "Users can view own enriched interactions" ON enriched_interactions;
CREATE POLICY "Users can view own enriched interactions" ON enriched_interactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own enriched interactions" ON enriched_interactions;
CREATE POLICY "Users can insert own enriched interactions" ON enriched_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Service role can manage all enriched interactions" ON enriched_interactions;
CREATE POLICY "Service role can manage all enriched interactions" ON enriched_interactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Tracking Event Queue Policies
DROP POLICY IF EXISTS "Users can insert tracking events" ON tracking_event_queue;
CREATE POLICY "Users can insert tracking events" ON tracking_event_queue
  FOR INSERT WITH CHECK (true); -- Allow all inserts (validated server-side)

DROP POLICY IF EXISTS "Service role can manage tracking events" ON tracking_event_queue;
CREATE POLICY "Service role can manage tracking events" ON tracking_event_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  p_dwell_time_ms INT,
  p_scroll_depth INT,
  p_hover_duration_ms INT,
  p_active_time_ms INT,
  p_text_copied BOOLEAN,
  p_image_interactions INT
)
RETURNS FLOAT AS $$
DECLARE
  score FLOAT := 0;
  active_ratio FLOAT;
BEGIN
  -- Dwell time (normalized to 0-1, max at 5 minutes)
  score := score + LEAST(p_dwell_time_ms::FLOAT / 300000, 1.0) * 0.3;

  -- Scroll depth
  score := score + (p_scroll_depth::FLOAT / 100) * 0.2;

  -- Hover duration
  score := score + LEAST(p_hover_duration_ms::FLOAT / 10000, 1.0) * 0.1;

  -- Active time ratio
  IF p_dwell_time_ms > 0 THEN
    active_ratio := p_active_time_ms::FLOAT / p_dwell_time_ms;
    score := score + active_ratio * 0.2;
  END IF;

  -- Action signals
  IF p_text_copied THEN
    score := score + 0.1;
  END IF;

  IF p_image_interactions > 2 THEN
    score := score + 0.1;
  END IF;

  RETURN LEAST(score, 1.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- 7. SCHEDULED JOBS (using pg_cron if available)
-- ============================================

-- Refresh materialized view daily at 2 AM
-- SELECT cron.schedule('refresh-interaction-features', '0 2 * * *', $$SELECT refresh_interaction_features()$$);

-- Clean up old tracking queue events (older than 7 days)
-- SELECT cron.schedule('cleanup-tracking-queue', '0 3 * * *', $$
--   DELETE FROM tracking_event_queue
--   WHERE created_at < NOW() - INTERVAL '7 days' AND status = 'completed'
-- $$);

-- ============================================
-- 8. COMMENTS
-- ============================================

COMMENT ON TABLE enriched_interactions IS 'Granular behavioral tracking with 50+ signals for ML/AI personalization';
COMMENT ON TABLE interaction_features IS 'Aggregated interaction metrics per user for ML training';
COMMENT ON TABLE tracking_event_queue IS 'Queue for batched processing of tracking events';
COMMENT ON COLUMN enriched_interactions.engagement_score IS 'Calculated engagement score (0-1) based on multiple signals';
COMMENT ON COLUMN enriched_interactions.cursor_path_complexity IS 'Complexity of cursor movement pattern (0-1)';
COMMENT ON FUNCTION calculate_engagement_score IS 'Calculates weighted engagement score from interaction signals';
