-- ================================================
-- Phase 11: Analytics Dashboard & Monitoring
-- ================================================
-- System analytics and performance monitoring
-- ================================================

-- ================================================
-- System Metrics
-- ================================================

CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name VARCHAR(100) NOT NULL,
  metric_value FLOAT NOT NULL,
  metric_type VARCHAR(50), -- 'counter', 'gauge', 'histogram'
  
  -- Dimensions
  tags JSONB, -- {"environment": "production", "service": "api"}
  
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_recorded ON system_metrics(recorded_at DESC);

-- ================================================
-- User Analytics
-- ================================================

CREATE TABLE IF NOT EXISTS user_analytics_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Engagement
  sessions_count INT DEFAULT 0,
  page_views_count INT DEFAULT 0,
  interactions_count INT DEFAULT 0,
  saved_destinations_count INT DEFAULT 0,
  
  -- Recommendations
  recommendations_viewed INT DEFAULT 0,
  recommendations_clicked INT DEFAULT 0,
  
  -- Time spent
  total_time_minutes INT DEFAULT 0,
  avg_session_duration_minutes FLOAT,
  
  -- Features used
  used_mood_filter BOOLEAN DEFAULT false,
  used_weather_filter BOOLEAN DEFAULT false,
  completed_onboarding BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_analytics_user ON user_analytics_summary(user_id);
CREATE INDEX idx_user_analytics_date ON user_analytics_summary(date DESC);

-- ================================================
-- Recommendation Performance
-- ================================================

CREATE TABLE IF NOT EXISTS recommendation_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  
  -- Algorithm performance
  algorithm_type VARCHAR(50), -- 'taste', 'mood', 'weather', 'hybrid'
  
  -- Metrics
  recommendations_generated INT DEFAULT 0,
  recommendations_clicked INT DEFAULT 0,
  click_through_rate FLOAT,
  
  -- Quality
  avg_match_score FLOAT,
  avg_confidence FLOAT,
  avg_user_rating FLOAT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, algorithm_type)
);

CREATE INDEX idx_rec_perf_date ON recommendation_performance(date DESC);
CREATE INDEX idx_rec_perf_algorithm ON recommendation_performance(algorithm_type);

-- ================================================
-- System Health
-- ================================================

CREATE TABLE IF NOT EXISTS system_health_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  check_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'healthy', 'degraded', 'down'
  
  -- Details
  response_time_ms FLOAT,
  error_message TEXT,
  details JSONB,
  
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_health_checks_name ON system_health_checks(check_name);
CREATE INDEX idx_health_checks_checked ON system_health_checks(checked_at DESC);

-- ================================================
-- Materialized Views for Dashboards
-- ================================================

-- Daily active users
CREATE MATERIALIZED VIEW daily_active_users AS
SELECT
  date,
  COUNT(DISTINCT user_id) as dau
FROM user_analytics_summary
GROUP BY date
ORDER BY date DESC;

CREATE UNIQUE INDEX ON daily_active_users(date);

-- Recommendation CTR by algorithm
CREATE MATERIALIZED VIEW recommendation_ctr_by_algorithm AS
SELECT
  algorithm_type,
  AVG(click_through_rate) as avg_ctr,
  SUM(recommendations_generated) as total_generated,
  SUM(recommendations_clicked) as total_clicked
FROM recommendation_performance
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY algorithm_type;

CREATE UNIQUE INDEX ON recommendation_ctr_by_algorithm(algorithm_type);

-- ================================================
-- Helper Functions
-- ================================================

-- Get daily stats
CREATE OR REPLACE FUNCTION get_daily_stats(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(
  total_users BIGINT,
  active_users BIGINT,
  new_users BIGINT,
  total_interactions BIGINT,
  total_recommendations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM auth.users)::BIGINT as total_users,
    (SELECT COUNT(DISTINCT user_id) FROM user_analytics_summary WHERE date = target_date)::BIGINT as active_users,
    (SELECT COUNT(*) FROM auth.users WHERE DATE(created_at) = target_date)::BIGINT as new_users,
    (SELECT COALESCE(SUM(interactions_count), 0) FROM user_analytics_summary WHERE date = target_date)::BIGINT as total_interactions,
    (SELECT COALESCE(SUM(recommendations_viewed), 0) FROM user_analytics_summary WHERE date = target_date)::BIGINT as total_recommendations;
END;
$$ LANGUAGE plpgsql;

-- Refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY recommendation_ctr_by_algorithm;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

-- Admin-only access to system metrics
CREATE POLICY "System metrics require admin" ON system_metrics
  FOR SELECT USING (false); -- Requires service role

CREATE POLICY "Health checks require admin" ON system_health_checks
  FOR SELECT USING (false); -- Requires service role

-- Users can view their own analytics
CREATE POLICY "Users can view own analytics" ON user_analytics_summary
  FOR SELECT USING (auth.uid() = user_id);

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE system_metrics IS 'System-wide metrics and KPIs';
COMMENT ON TABLE user_analytics_summary IS 'Daily user engagement summary';
COMMENT ON TABLE recommendation_performance IS 'Recommendation algorithm performance';
COMMENT ON TABLE system_health_checks IS 'Service health monitoring';

COMMENT ON FUNCTION get_daily_stats IS 'Returns key daily statistics';
COMMENT ON FUNCTION refresh_analytics_views IS 'Refreshes materialized views for dashboards';
