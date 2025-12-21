-- Migration 502: Performance Analytics Tables
-- Stores Core Web Vitals and custom analytics events

BEGIN;

-- ============================================================================
-- PERFORMANCE METRICS TABLE
-- Stores Core Web Vitals (LCP, FID, CLS, TTFB, FCP, INP)
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGSERIAL PRIMARY KEY,

  -- Metric details
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL(12, 4) NOT NULL,
  rating VARCHAR(20) DEFAULT 'unknown', -- 'good', 'needs-improvement', 'poor'
  delta DECIMAL(12, 4),

  -- Context
  page_path VARCHAR(500),
  navigation_type VARCHAR(50),
  metric_id VARCHAR(100),

  -- User context (nullable for anonymous)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  user_agent TEXT,

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_perf_metrics_name_timestamp
  ON performance_metrics(metric_name, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_page_path
  ON performance_metrics(page_path, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_timestamp
  ON performance_metrics(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_perf_metrics_rating
  ON performance_metrics(rating, metric_name);

-- Partial index for Core Web Vitals only
CREATE INDEX IF NOT EXISTS idx_perf_metrics_core_vitals
  ON performance_metrics(metric_name, timestamp DESC)
  WHERE metric_name IN ('LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'INP');

-- ============================================================================
-- ANALYTICS EVENTS TABLE
-- Stores custom analytics events (page views, interactions, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGSERIAL PRIMARY KEY,

  -- Event details
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',

  -- Context
  page_path VARCHAR(500),
  referrer TEXT,

  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  user_agent TEXT,
  viewport_width INTEGER,
  viewport_height INTEGER,

  -- Timestamps
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_timestamp
  ON analytics_events(event_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session
  ON analytics_events(session_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp
  ON analytics_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path
  ON analytics_events(page_path, timestamp DESC);

-- GIN index for JSONB event_data queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_data
  ON analytics_events USING GIN (event_data);

-- ============================================================================
-- ANALYTICS SESSIONS TABLE
-- Tracks user sessions for aggregation
-- ============================================================================

CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(100) UNIQUE NOT NULL,

  -- User context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Session metrics
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  page_count INTEGER DEFAULT 1,
  event_count INTEGER DEFAULT 0,

  -- Device info
  browser VARCHAR(100),
  os VARCHAR(100),
  device_type VARCHAR(50),

  -- First/last page
  entry_page VARCHAR(500),
  exit_page VARCHAR(500),

  -- Engagement
  bounce BOOLEAN DEFAULT TRUE,
  duration_seconds INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON analytics_sessions(user_id, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_start_time
  ON analytics_sessions(start_time DESC);

-- ============================================================================
-- PERFORMANCE AGGREGATES VIEW
-- Pre-aggregated metrics for dashboard queries
-- ============================================================================

CREATE OR REPLACE VIEW performance_metrics_daily AS
SELECT
  DATE_TRUNC('day', timestamp) AS date,
  metric_name,
  COUNT(*) AS sample_count,
  AVG(metric_value) AS avg_value,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY metric_value) AS p50_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75_value,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY metric_value) AS p90_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95_value,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) AS p99_value,
  MIN(metric_value) AS min_value,
  MAX(metric_value) AS max_value,
  COUNT(*) FILTER (WHERE rating = 'good') AS good_count,
  COUNT(*) FILTER (WHERE rating = 'needs-improvement') AS needs_improvement_count,
  COUNT(*) FILTER (WHERE rating = 'poor') AS poor_count
FROM performance_metrics
GROUP BY DATE_TRUNC('day', timestamp), metric_name;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;

-- Performance metrics: allow anonymous inserts, service role full access
DROP POLICY IF EXISTS "Allow anonymous inserts on perf_metrics" ON performance_metrics;
CREATE POLICY "Allow anonymous inserts on perf_metrics" ON performance_metrics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access perf_metrics" ON performance_metrics;
CREATE POLICY "Service role full access perf_metrics" ON performance_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Analytics events: allow anonymous inserts, service role full access
DROP POLICY IF EXISTS "Allow anonymous inserts on analytics_events" ON analytics_events;
CREATE POLICY "Allow anonymous inserts on analytics_events" ON analytics_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access analytics_events" ON analytics_events;
CREATE POLICY "Service role full access analytics_events" ON analytics_events
  FOR ALL USING (auth.role() = 'service_role');

-- Sessions: service role only
DROP POLICY IF EXISTS "Service role full access sessions" ON analytics_sessions;
CREATE POLICY "Service role full access sessions" ON analytics_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get Core Web Vitals summary for a time period
CREATE OR REPLACE FUNCTION get_web_vitals_summary(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  metric_name TEXT,
  avg_value DECIMAL,
  p75_value DECIMAL,
  good_percentage DECIMAL,
  sample_count BIGINT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.metric_name::TEXT,
    ROUND(AVG(pm.metric_value)::DECIMAL, 2) as avg_value,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY pm.metric_value)::DECIMAL, 2) as p75_value,
    ROUND((COUNT(*) FILTER (WHERE pm.rating = 'good') * 100.0 / NULLIF(COUNT(*), 0))::DECIMAL, 1) as good_percentage,
    COUNT(*)::BIGINT as sample_count,
    CASE
      WHEN AVG(pm.metric_value) <=
        CASE pm.metric_name
          WHEN 'LCP' THEN 2500
          WHEN 'FID' THEN 100
          WHEN 'CLS' THEN 0.1
          WHEN 'INP' THEN 200
          WHEN 'FCP' THEN 1800
          WHEN 'TTFB' THEN 800
          ELSE 1000
        END
      THEN 'good'
      WHEN AVG(pm.metric_value) <=
        CASE pm.metric_name
          WHEN 'LCP' THEN 4000
          WHEN 'FID' THEN 300
          WHEN 'CLS' THEN 0.25
          WHEN 'INP' THEN 500
          WHEN 'FCP' THEN 3000
          WHEN 'TTFB' THEN 1800
          ELSE 3000
        END
      THEN 'needs-improvement'
      ELSE 'poor'
    END as status
  FROM performance_metrics pm
  WHERE pm.timestamp BETWEEN p_start_date AND p_end_date
    AND pm.metric_name IN ('LCP', 'FID', 'CLS', 'INP', 'FCP', 'TTFB')
  GROUP BY pm.metric_name;
END;
$$;

-- Get analytics event counts by type
CREATE OR REPLACE FUNCTION get_event_counts(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  unique_users BIGINT,
  unique_sessions BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.event_type::TEXT,
    COUNT(*)::BIGINT as event_count,
    COUNT(DISTINCT ae.user_id)::BIGINT as unique_users,
    COUNT(DISTINCT ae.session_id)::BIGINT as unique_sessions
  FROM analytics_events ae
  WHERE ae.timestamp BETWEEN p_start_date AND p_end_date
  GROUP BY ae.event_type
  ORDER BY event_count DESC;
END;
$$;

-- Get daily active users and sessions
CREATE OR REPLACE FUNCTION get_daily_analytics(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  unique_users BIGINT,
  unique_sessions BIGINT,
  total_events BIGINT,
  page_views BIGINT,
  avg_session_duration DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', ae.timestamp)::DATE as date,
    COUNT(DISTINCT ae.user_id)::BIGINT as unique_users,
    COUNT(DISTINCT ae.session_id)::BIGINT as unique_sessions,
    COUNT(*)::BIGINT as total_events,
    COUNT(*) FILTER (WHERE ae.event_type = 'page_view')::BIGINT as page_views,
    COALESCE(AVG(s.duration_seconds), 0)::DECIMAL as avg_session_duration
  FROM analytics_events ae
  LEFT JOIN analytics_sessions s ON s.session_id = ae.session_id
  WHERE ae.timestamp > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE_TRUNC('day', ae.timestamp)
  ORDER BY date DESC;
END;
$$;

-- Get performance trends over time
CREATE OR REPLACE FUNCTION get_performance_trends(
  p_metric_name TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  avg_value DECIMAL,
  p75_value DECIMAL,
  sample_count BIGINT,
  good_rate DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE_TRUNC('day', pm.timestamp)::DATE as date,
    ROUND(AVG(pm.metric_value)::DECIMAL, 2) as avg_value,
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY pm.metric_value)::DECIMAL, 2) as p75_value,
    COUNT(*)::BIGINT as sample_count,
    ROUND((COUNT(*) FILTER (WHERE pm.rating = 'good') * 100.0 / NULLIF(COUNT(*), 0))::DECIMAL, 1) as good_rate
  FROM performance_metrics pm
  WHERE pm.metric_name = p_metric_name
    AND pm.timestamp > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE_TRUNC('day', pm.timestamp)
  ORDER BY date DESC;
END;
$$;

-- Increment session event count
CREATE OR REPLACE FUNCTION increment_session_event_count(p_session_id VARCHAR)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE analytics_sessions
  SET
    event_count = event_count + 1,
    updated_at = NOW()
  WHERE session_id = p_session_id;
END;
$$;

-- ============================================================================
-- DATA RETENTION
-- Automatically clean up old metrics data (keep 90 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  perf_deleted INTEGER;
  events_deleted INTEGER;
BEGIN
  -- Delete old performance metrics (keep 90 days)
  DELETE FROM performance_metrics
  WHERE timestamp < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS perf_deleted = ROW_COUNT;
  deleted_count := deleted_count + perf_deleted;

  -- Delete old analytics events (keep 90 days)
  DELETE FROM analytics_events
  WHERE timestamp < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS events_deleted = ROW_COUNT;
  deleted_count := deleted_count + events_deleted;

  -- Delete old sessions (keep 90 days)
  DELETE FROM analytics_sessions
  WHERE start_time < NOW() - INTERVAL '90 days';

  RETURN deleted_count;
END;
$$;

COMMIT;
