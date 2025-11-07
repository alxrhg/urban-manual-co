-- Migration 411: Add Instagram and TikTok Social Media Data
-- Adds columns for Instagram and TikTok trend data

BEGIN;

-- Add Instagram trends columns
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS instagram_hashtag_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_post_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_total_likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_total_comments INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_engagement_score FLOAT DEFAULT 0 CHECK (instagram_engagement_score >= 0 AND instagram_engagement_score <= 1),
  ADD COLUMN IF NOT EXISTS instagram_trending_hashtags TEXT[],
  ADD COLUMN IF NOT EXISTS instagram_updated_at TIMESTAMPTZ;

-- Add TikTok trends columns
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS tiktok_hashtag_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_video_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_total_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_total_likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_total_shares INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tiktok_engagement_score FLOAT DEFAULT 0 CHECK (tiktok_engagement_score >= 0 AND tiktok_engagement_score <= 1),
  ADD COLUMN IF NOT EXISTS tiktok_trending_hashtags TEXT[],
  ADD COLUMN IF NOT EXISTS tiktok_trending_score FLOAT DEFAULT 0 CHECK (tiktok_trending_score >= 0 AND tiktok_trending_score <= 1),
  ADD COLUMN IF NOT EXISTS tiktok_updated_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_destinations_instagram_engagement 
  ON destinations(instagram_engagement_score DESC) 
  WHERE instagram_engagement_score > 0;

CREATE INDEX IF NOT EXISTS idx_destinations_tiktok_trending 
  ON destinations(tiktok_trending_score DESC) 
  WHERE tiktok_trending_score > 0;

CREATE INDEX IF NOT EXISTS idx_destinations_tiktok_views 
  ON destinations(tiktok_total_views DESC) 
  WHERE tiktok_total_views > 0;

-- Enhanced multi-source trending score function (includes Instagram & TikTok)
CREATE OR REPLACE FUNCTION compute_enhanced_social_trending_scores()
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
    -- Internal engagement (35% weight)
    COALESCE(es.engagement_score * es.time_decay, 0) * 0.35 +
    -- Google Trends interest (20% weight)
    (LEAST(COALESCE(d.google_trends_interest, 0) / 100.0, 1)) * 0.20 +
    -- Reddit signals (8% weight)
    LEAST(LOG(GREATEST(d.reddit_upvote_score, 1)) / 15, 1) * 0.08 +
    -- News mentions (8% weight)
    LEAST(d.news_article_count / 20.0, 1) * 0.08 +
    -- Eventbrite attendance (8% weight)
    LEAST(LOG(GREATEST(d.eventbrite_total_attendance, 1)) / 12, 1) * 0.08 +
    -- Instagram engagement (10% weight)
    COALESCE(d.instagram_engagement_score, 0) * 0.10 +
    -- TikTok trending (8% weight)
    COALESCE(d.tiktok_trending_score, 0) * 0.08 +
    -- Trend direction boost (3% weight)
    CASE 
      WHEN d.google_trends_direction = 'rising' THEN 0.03
      WHEN d.google_trends_direction = 'falling' THEN -0.01
      ELSE 0
    END +
    -- News sentiment boost
    CASE 
      WHEN d.news_sentiment_score > 0.3 THEN 0.02
      WHEN d.news_sentiment_score < -0.3 THEN -0.01
      ELSE 0
    END
  )
  FROM engagement_scores es
  WHERE d.id = es.destination_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;

