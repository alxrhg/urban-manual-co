-- Migration 409: Add Google Trends Integration
-- Adds columns and functions to store and compute Google Trends data

BEGIN;

-- Add Google Trends columns to destinations table
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS google_trends_interest INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS google_trends_direction TEXT DEFAULT 'stable' CHECK (google_trends_direction IN ('rising', 'stable', 'falling')),
  ADD COLUMN IF NOT EXISTS google_trends_related_queries TEXT[],
  ADD COLUMN IF NOT EXISTS google_trends_updated_at TIMESTAMPTZ;

-- Create index for trending queries
CREATE INDEX IF NOT EXISTS idx_destinations_google_trends_interest 
  ON destinations(google_trends_interest DESC) 
  WHERE google_trends_interest > 0;

CREATE INDEX IF NOT EXISTS idx_destinations_google_trends_direction 
  ON destinations(google_trends_direction) 
  WHERE google_trends_direction = 'rising';

-- Enhanced trending score function that combines internal metrics with Google Trends
CREATE OR REPLACE FUNCTION compute_enhanced_trending_scores()
RETURNS void AS $$
BEGIN
  WITH recent_engagement AS (
    SELECT 
      d.id as destination_id,
      COUNT(DISTINCT sp.user_id) as recent_saves,
      COUNT(DISTINCT vp.user_id) as recent_visits,
      MAX(GREATEST(sp.saved_at, vp.visited_at)) as last_interaction
    FROM destinations d
    LEFT JOIN saved_places sp ON sp.destination_slug = d.slug 
      AND sp.saved_at > NOW() - INTERVAL '14 days'
    LEFT JOIN visited_places vp ON vp.destination_slug = d.slug 
      AND vp.visited_at > NOW() - INTERVAL '14 days'
    GROUP BY d.id
  ),
  engagement_scores AS (
    SELECT 
      re.destination_id,
      -- Internal engagement score (0-1 scale)
      LEAST(LOG(GREATEST(re.recent_saves + re.recent_visits, 1)) / 10, 1) as engagement_score,
      -- Time decay factor
      EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(re.last_interaction, NOW()))) / 604800) as time_decay
    FROM recent_engagement re
  )
  UPDATE destinations d
  SET trending_score = (
    -- Internal engagement (60% weight)
    COALESCE(es.engagement_score * es.time_decay, 0) * 0.6 +
    -- Google Trends interest (30% weight) - normalized to 0-1 scale
    (LEAST(COALESCE(d.google_trends_interest, 0) / 100.0, 1)) * 0.3 +
    -- Trend direction boost (10% weight)
    CASE 
      WHEN d.google_trends_direction = 'rising' THEN 0.1
      WHEN d.google_trends_direction = 'falling' THEN -0.05
      ELSE 0
    END
  )
  FROM engagement_scores es
  WHERE d.id = es.destination_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update Google Trends data for a destination
CREATE OR REPLACE FUNCTION update_google_trends(
  destination_id_param INTEGER,
  interest_value INTEGER,
  direction_value TEXT,
  related_queries_value TEXT[] DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE destinations
  SET 
    google_trends_interest = interest_value,
    google_trends_direction = direction_value,
    google_trends_related_queries = related_queries_value,
    google_trends_updated_at = NOW()
  WHERE id = destination_id_param;
END;
$$ LANGUAGE plpgsql;

COMMIT;

