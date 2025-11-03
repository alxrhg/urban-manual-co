-- Popularity and helper functions (idempotent)

-- View: popularity_view
-- Aggregates recent saves and visits with exponential decay to produce trending_score
CREATE MATERIALIZED VIEW IF NOT EXISTS popularity_view AS
WITH saves AS (
  SELECT destination_slug,
         SUM(EXP(-GREATEST(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400.0, 0) / 14.0))::float AS save_decay
  FROM saved_places
  WHERE created_at > NOW() - INTERVAL '90 days'
  GROUP BY destination_slug
),
visits AS (
  SELECT destination_slug,
         SUM(EXP(-GREATEST(EXTRACT(EPOCH FROM (NOW() - visited_at)) / 86400.0, 0) / 14.0))::float AS visit_decay
  FROM visited_places
  WHERE visited_at > NOW() - INTERVAL '90 days'
  GROUP BY destination_slug
)
SELECT d.id AS destination_id,
       d.slug AS destination_slug,
       COALESCE(s.save_decay, 0) * 0.4 + COALESCE(v.visit_decay, 0) * 0.6 AS trending_score,
       NOW() AS computed_at
FROM destinations d
LEFT JOIN saves s ON s.destination_slug = d.slug
LEFT JOIN visits v ON v.destination_slug = d.slug;

CREATE INDEX IF NOT EXISTS idx_popularity_trending_score ON popularity_view(trending_score DESC);

-- Helper function: refresh popularity view
CREATE OR REPLACE FUNCTION refresh_popularity_view()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popularity_view;
END;
$$ LANGUAGE plpgsql;

-- Helper: log job execution
CREATE OR REPLACE FUNCTION log_job(p_name text, p_status text, p_duration_ms int, p_notes text)
RETURNS void AS $$
BEGIN
  INSERT INTO jobs_history(job_name, status, duration_ms, notes) VALUES (p_name, p_status, p_duration_ms, p_notes);
END;
$$ LANGUAGE plpgsql;
