-- Migration 501: Quality Events for Intelligence Telemetry
-- Tracks recommendation quality signals for scientific iteration
-- CTR on chips, saves, adds-to-trip, undo rates

BEGIN;

-- ============================================================================
-- QUALITY EVENTS TABLE
-- Tracks recommendation quality signals for algorithm optimization
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User (nullable for anonymous tracking)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,

  -- Event classification
  event_type TEXT NOT NULL, -- 'chip_view' | 'chip_click' | 'chip_remove' | 'save' | 'add_to_trip' | 'undo'

  -- Source context
  source_type TEXT, -- 'insight' | 'refinement' | 'intent' | 'category' | 'recommendation'
  source_id TEXT,   -- Unique identifier for the source element
  source_label TEXT, -- Human-readable label

  -- Position tracking (for CTR analysis)
  position INTEGER, -- Position in list/grid (0-indexed)
  total_items INTEGER, -- Total items in the set

  -- Recommendation context
  recommendation_source TEXT, -- 'curated' | 'google' | 'ai' | 'collaborative' | 'content'
  recommendation_score FLOAT, -- Original recommendation score if available

  -- Destination context (if applicable)
  destination_slug TEXT,
  destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL,
  destination_category TEXT,

  -- Page/feature context
  page_context TEXT, -- 'homepage' | 'search' | 'chat' | 'destination' | 'trip'
  feature_context TEXT, -- 'discovery' | 'recommendations' | 'smart_fill' | 'nearby'

  -- Result tracking
  result_type TEXT, -- 'accepted' | 'ignored' | 'dismissed' | 'reversed'

  -- Engagement metrics
  dwell_time_ms INTEGER,

  -- Rich context (JSONB for flexibility)
  metadata JSONB DEFAULT '{}',

  -- Timing
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User-based queries
CREATE INDEX IF NOT EXISTS idx_quality_events_user
  ON quality_events(user_id, created_at DESC);

-- Event type analysis
CREATE INDEX IF NOT EXISTS idx_quality_events_type
  ON quality_events(event_type, created_at DESC);

-- Source type analysis (chip types)
CREATE INDEX IF NOT EXISTS idx_quality_events_source
  ON quality_events(source_type, event_type, created_at DESC);

-- CTR analysis (position-based)
CREATE INDEX IF NOT EXISTS idx_quality_events_position
  ON quality_events(source_type, position, event_type)
  WHERE position IS NOT NULL;

-- Recommendation source performance
CREATE INDEX IF NOT EXISTS idx_quality_events_rec_source
  ON quality_events(recommendation_source, result_type, created_at DESC)
  WHERE recommendation_source IS NOT NULL;

-- Page context analysis
CREATE INDEX IF NOT EXISTS idx_quality_events_page
  ON quality_events(page_context, feature_context, event_type);

-- Destination analysis
CREATE INDEX IF NOT EXISTS idx_quality_events_destination
  ON quality_events(destination_slug, event_type)
  WHERE destination_slug IS NOT NULL;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE quality_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
DROP POLICY IF EXISTS "Users see own quality events" ON quality_events;
CREATE POLICY "Users see own quality events" ON quality_events
  FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access (for analytics)
DROP POLICY IF EXISTS "Service role full access quality" ON quality_events;
CREATE POLICY "Service role full access quality" ON quality_events
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anonymous inserts (tracking before login)
DROP POLICY IF EXISTS "Allow anonymous quality inserts" ON quality_events;
CREATE POLICY "Allow anonymous quality inserts" ON quality_events
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- ANALYTICS FUNCTIONS
-- ============================================================================

-- Calculate CTR by source type
CREATE OR REPLACE FUNCTION get_quality_ctr_by_source(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  source_type TEXT,
  total_views BIGINT,
  total_clicks BIGINT,
  ctr FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH views AS (
    SELECT
      qe.source_type,
      COUNT(*) as view_count
    FROM quality_events qe
    WHERE qe.event_type = 'chip_view'
      AND qe.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qe.source_type
  ),
  clicks AS (
    SELECT
      qe.source_type,
      COUNT(*) as click_count
    FROM quality_events qe
    WHERE qe.event_type = 'chip_click'
      AND qe.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qe.source_type
  )
  SELECT
    COALESCE(v.source_type, c.source_type) as source_type,
    COALESCE(v.view_count, 0)::BIGINT as total_views,
    COALESCE(c.click_count, 0)::BIGINT as total_clicks,
    CASE
      WHEN COALESCE(v.view_count, 0) > 0
      THEN ROUND((COALESCE(c.click_count, 0)::FLOAT / v.view_count * 100)::NUMERIC, 2)
      ELSE 0
    END as ctr
  FROM views v
  FULL OUTER JOIN clicks c ON v.source_type = c.source_type
  ORDER BY ctr DESC;
END;
$$;

-- Calculate save rate by recommendation source
CREATE OR REPLACE FUNCTION get_quality_save_rate(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  recommendation_source TEXT,
  total_recommendations BIGINT,
  total_saves BIGINT,
  save_rate FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH recommendations AS (
    SELECT
      qe.recommendation_source,
      COUNT(DISTINCT qe.destination_slug) as rec_count
    FROM quality_events qe
    WHERE qe.event_type IN ('chip_click', 'chip_view')
      AND qe.recommendation_source IS NOT NULL
      AND qe.destination_slug IS NOT NULL
      AND qe.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qe.recommendation_source
  ),
  saves AS (
    SELECT
      qe.recommendation_source,
      COUNT(*) as save_count
    FROM quality_events qe
    WHERE qe.event_type = 'save'
      AND qe.recommendation_source IS NOT NULL
      AND qe.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qe.recommendation_source
  )
  SELECT
    COALESCE(r.recommendation_source, s.recommendation_source) as recommendation_source,
    COALESCE(r.rec_count, 0)::BIGINT as total_recommendations,
    COALESCE(s.save_count, 0)::BIGINT as total_saves,
    CASE
      WHEN COALESCE(r.rec_count, 0) > 0
      THEN ROUND((COALESCE(s.save_count, 0)::FLOAT / r.rec_count * 100)::NUMERIC, 2)
      ELSE 0
    END as save_rate
  FROM recommendations r
  FULL OUTER JOIN saves s ON r.recommendation_source = s.recommendation_source
  ORDER BY save_rate DESC;
END;
$$;

-- Calculate undo rate
CREATE OR REPLACE FUNCTION get_quality_undo_rate(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  action_type TEXT,
  total_actions BIGINT,
  total_undos BIGINT,
  undo_rate FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH actions AS (
    SELECT
      qe.event_type as action_type,
      COUNT(*) as action_count
    FROM quality_events qe
    WHERE qe.event_type IN ('save', 'add_to_trip')
      AND qe.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qe.event_type
  ),
  undos AS (
    SELECT
      (qe.metadata->>'original_action')::TEXT as action_type,
      COUNT(*) as undo_count
    FROM quality_events qe
    WHERE qe.event_type = 'undo'
      AND qe.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qe.metadata->>'original_action'
  )
  SELECT
    COALESCE(a.action_type, u.action_type) as action_type,
    COALESCE(a.action_count, 0)::BIGINT as total_actions,
    COALESCE(u.undo_count, 0)::BIGINT as total_undos,
    CASE
      WHEN COALESCE(a.action_count, 0) > 0
      THEN ROUND((COALESCE(u.undo_count, 0)::FLOAT / a.action_count * 100)::NUMERIC, 2)
      ELSE 0
    END as undo_rate
  FROM actions a
  FULL OUTER JOIN undos u ON a.action_type = u.action_type
  ORDER BY undo_rate DESC;
END;
$$;

-- Position-based CTR analysis
CREATE OR REPLACE FUNCTION get_quality_position_ctr(
  p_source_type TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  position INTEGER,
  total_views BIGINT,
  total_clicks BIGINT,
  ctr FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH views AS (
    SELECT
      qe.position,
      COUNT(*) as view_count
    FROM quality_events qe
    WHERE qe.event_type = 'chip_view'
      AND qe.position IS NOT NULL
      AND (p_source_type IS NULL OR qe.source_type = p_source_type)
      AND qe.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qe.position
  ),
  clicks AS (
    SELECT
      qe.position,
      COUNT(*) as click_count
    FROM quality_events qe
    WHERE qe.event_type = 'chip_click'
      AND qe.position IS NOT NULL
      AND (p_source_type IS NULL OR qe.source_type = p_source_type)
      AND qe.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY qe.position
  )
  SELECT
    COALESCE(v.position, c.position) as position,
    COALESCE(v.view_count, 0)::BIGINT as total_views,
    COALESCE(c.click_count, 0)::BIGINT as total_clicks,
    CASE
      WHEN COALESCE(v.view_count, 0) > 0
      THEN ROUND((COALESCE(c.click_count, 0)::FLOAT / v.view_count * 100)::NUMERIC, 2)
      ELSE 0
    END as ctr
  FROM views v
  FULL OUTER JOIN clicks c ON v.position = c.position
  ORDER BY position ASC;
END;
$$;

-- Get quality metrics summary
CREATE OR REPLACE FUNCTION get_quality_summary(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  metric_name TEXT,
  metric_value FLOAT,
  sample_size BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY

  -- Overall chip CTR
  SELECT
    'chip_ctr'::TEXT as metric_name,
    ROUND((
      COUNT(*) FILTER (WHERE event_type = 'chip_click')::FLOAT /
      NULLIF(COUNT(*) FILTER (WHERE event_type = 'chip_view'), 0) * 100
    )::NUMERIC, 2) as metric_value,
    COUNT(*) FILTER (WHERE event_type IN ('chip_view', 'chip_click'))::BIGINT as sample_size
  FROM quality_events
  WHERE created_at > NOW() - (p_days || ' days')::INTERVAL

  UNION ALL

  -- Save rate (from recommendations)
  SELECT
    'save_rate'::TEXT,
    ROUND((
      COUNT(*) FILTER (WHERE event_type = 'save')::FLOAT /
      NULLIF(COUNT(*) FILTER (WHERE event_type = 'chip_click'), 0) * 100
    )::NUMERIC, 2),
    COUNT(*) FILTER (WHERE event_type IN ('save', 'chip_click'))::BIGINT
  FROM quality_events
  WHERE created_at > NOW() - (p_days || ' days')::INTERVAL

  UNION ALL

  -- Add to trip rate
  SELECT
    'add_to_trip_rate'::TEXT,
    ROUND((
      COUNT(*) FILTER (WHERE event_type = 'add_to_trip')::FLOAT /
      NULLIF(COUNT(*) FILTER (WHERE event_type = 'chip_click'), 0) * 100
    )::NUMERIC, 2),
    COUNT(*) FILTER (WHERE event_type IN ('add_to_trip', 'chip_click'))::BIGINT
  FROM quality_events
  WHERE created_at > NOW() - (p_days || ' days')::INTERVAL

  UNION ALL

  -- Undo rate
  SELECT
    'undo_rate'::TEXT,
    ROUND((
      COUNT(*) FILTER (WHERE event_type = 'undo')::FLOAT /
      NULLIF(COUNT(*) FILTER (WHERE event_type IN ('save', 'add_to_trip')), 0) * 100
    )::NUMERIC, 2),
    COUNT(*) FILTER (WHERE event_type IN ('undo', 'save', 'add_to_trip'))::BIGINT
  FROM quality_events
  WHERE created_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$;

COMMIT;
