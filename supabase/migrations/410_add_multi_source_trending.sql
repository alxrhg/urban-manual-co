-- Migration 410: Add Multi-Source Trending Data
-- Adds columns for Reddit, News, and Eventbrite trend data

BEGIN;

-- Add Reddit trends columns
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS reddit_mention_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reddit_upvote_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reddit_trending_subreddits TEXT[],
  ADD COLUMN IF NOT EXISTS reddit_updated_at TIMESTAMPTZ;

-- Add News trends columns
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS news_article_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS news_sentiment_score FLOAT DEFAULT 0 CHECK (news_sentiment_score >= -1 AND news_sentiment_score <= 1),
  ADD COLUMN IF NOT EXISTS news_top_sources TEXT[],
  ADD COLUMN IF NOT EXISTS news_updated_at TIMESTAMPTZ;

-- Add Eventbrite trends columns
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS eventbrite_event_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eventbrite_total_attendance INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS eventbrite_event_categories TEXT[],
  ADD COLUMN IF NOT EXISTS eventbrite_updated_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_destinations_reddit_score 
  ON destinations(reddit_upvote_score DESC) 
  WHERE reddit_upvote_score > 0;

CREATE INDEX IF NOT EXISTS idx_destinations_news_count 
  ON destinations(news_article_count DESC) 
  WHERE news_article_count > 0;

CREATE INDEX IF NOT EXISTS idx_destinations_eventbrite_attendance 
  ON destinations(eventbrite_total_attendance DESC) 
  WHERE eventbrite_total_attendance > 0;

-- Enhanced multi-source trending score function
CREATE OR REPLACE FUNCTION compute_multi_source_trending_scores()
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
      LEAST(LOG(GREATEST(re.recent_saves + re.recent_visits, 1)) / 10, 1) as engagement_score,
      EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(re.last_interaction, NOW()))) / 604800) as time_decay
    FROM recent_engagement re
  )
  UPDATE destinations d
  SET trending_score = (
    -- Internal engagement (40% weight)
    COALESCE(es.engagement_score * es.time_decay, 0) * 0.40 +
    -- Google Trends interest (25% weight)
    (LEAST(COALESCE(d.google_trends_interest, 0) / 100.0, 1)) * 0.25 +
    -- Reddit signals (10% weight) - normalized
    LEAST(LOG(GREATEST(d.reddit_upvote_score, 1)) / 15, 1) * 0.10 +
    -- News mentions (10% weight) - normalized
    LEAST(d.news_article_count / 20.0, 1) * 0.10 +
    -- Eventbrite attendance (10% weight) - normalized
    LEAST(LOG(GREATEST(d.eventbrite_total_attendance, 1)) / 12, 1) * 0.10 +
    -- Trend direction boost (5% weight)
    CASE 
      WHEN d.google_trends_direction = 'rising' THEN 0.05
      WHEN d.google_trends_direction = 'falling' THEN -0.02
      ELSE 0
    END +
    -- News sentiment boost (positive news = boost)
    CASE 
      WHEN d.news_sentiment_score > 0.3 THEN 0.05
      WHEN d.news_sentiment_score < -0.3 THEN -0.02
      ELSE 0
    END
  )
  FROM engagement_scores es
  WHERE d.id = es.destination_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;

