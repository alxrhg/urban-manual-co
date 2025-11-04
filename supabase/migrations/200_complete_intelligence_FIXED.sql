-- Migration 200: Complete Intelligence Layer (FIXED VERSION)
-- Handles missing dependencies gracefully
-- Ranking, trending, co-visitation, relationships, personalization, and intelligent search

BEGIN;

-- ============================================================================
-- PREREQUISITES CHECK
-- ============================================================================

-- Ensure pgvector extension exists
CREATE EXTENSION IF NOT EXISTS vector;

-- Ensure required tables exist
DO $$
BEGIN
  -- Check if saved_places exists, if not create minimal version
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_places') THEN
    CREATE TABLE saved_places (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      destination_slug TEXT NOT NULL,
      saved_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, destination_slug)
    );
  END IF;

  -- Check if visited_places exists, if not create minimal version
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_places') THEN
    CREATE TABLE visited_places (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      destination_slug TEXT NOT NULL,
      visited_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, destination_slug)
    );
  END IF;
END $$;

-- ============================================================================
-- RANKING & TRENDING COLUMNS
-- ============================================================================

ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS rank_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saves_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_open_now BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviews_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_destinations_rank 
  ON destinations(rank_score DESC) WHERE rank_score > 0;

CREATE INDEX IF NOT EXISTS idx_destinations_trending 
  ON destinations(trending_score DESC) WHERE trending_score > 0;

-- Compute rank score (editorial quality + engagement)
CREATE OR REPLACE FUNCTION compute_rank_scores()
RETURNS void AS $$
BEGIN
  UPDATE destinations d
  SET rank_score = (
    -- Editorial quality (60%)
    COALESCE(d.rating / 5.0, 0.5) * 0.6 +
    -- Popularity signals (40%)
    (LOG(GREATEST(d.views_count, 1)) / 10) * 0.2 +
    (LOG(GREATEST(d.saves_count, 1)) / 10) * 0.2
  )
  WHERE d.rating >= 4.0; -- Only high-quality places get ranked
END;
$$ LANGUAGE plpgsql;

-- Compute trending score (recent engagement with time decay)
CREATE OR REPLACE FUNCTION compute_trending_scores()
RETURNS void AS $$
BEGIN
  -- Only compute if saved_places and visited_places exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_places')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_places') THEN
    
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
    )
    UPDATE destinations d
    SET trending_score = (
      LOG(GREATEST(re.recent_saves + re.recent_visits, 1)) *
      EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(re.last_interaction, NOW()))) / 604800)
    )
    FROM recent_engagement re
    WHERE d.id = re.destination_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CO-VISITATION SIGNALS
-- ============================================================================

-- Drop existing table if it has wrong column types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'co_visit_signals'
  ) THEN
    -- Check if columns are UUID (wrong type)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'co_visit_signals' 
      AND column_name = 'destination_a' 
      AND data_type = 'uuid'
    ) THEN
      DROP TABLE co_visit_signals CASCADE;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS co_visit_signals (
  destination_a INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
  destination_b INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
  co_visit_score FLOAT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (destination_a, destination_b)
);

CREATE INDEX IF NOT EXISTS idx_co_visit_a ON co_visit_signals(destination_a, co_visit_score DESC);
CREATE INDEX IF NOT EXISTS idx_co_visit_b ON co_visit_signals(destination_b, co_visit_score DESC);

CREATE OR REPLACE FUNCTION compute_co_visitation()
RETURNS void AS $$
BEGIN
  -- Only compute if visited_places exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visited_places') THEN
    TRUNCATE co_visit_signals;
    
    INSERT INTO co_visit_signals
    SELECT 
      d1.id as destination_a,
      d2.id as destination_b,
      COUNT(DISTINCT vp1.user_id) * 
        EXP(-EXTRACT(EPOCH FROM (NOW() - MAX(vp1.visited_at))) / 2592000) 
        as co_visit_score,
      NOW()
    FROM visited_places vp1
    JOIN destinations d1 ON d1.slug = vp1.destination_slug
    JOIN visited_places vp2 ON vp1.user_id = vp2.user_id
    JOIN destinations d2 ON d2.slug = vp2.destination_slug
    WHERE d1.id < d2.id
      AND vp1.visited_at > NOW() - INTERVAL '6 months'
    GROUP BY d1.id, d2.id
    HAVING COUNT(DISTINCT vp1.user_id) >= 2;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DESTINATION RELATIONSHIPS (SIMILAR & COMPLEMENTARY)
-- ============================================================================

-- Drop existing table if it has wrong column types
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'destination_relationships'
  ) THEN
    -- Check if columns are UUID (wrong type) or if relation_type column doesn't exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'destination_relationships' 
      AND column_name = 'destination_a' 
      AND data_type = 'uuid'
    ) OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'destination_relationships' 
      AND column_name = 'relation_type'
    ) THEN
      DROP TABLE destination_relationships CASCADE;
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS destination_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_a INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
  destination_b INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
  relation_type TEXT CHECK (relation_type IN ('similar', 'complementary')),
  similarity_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(destination_a, destination_b, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_relationships_a ON destination_relationships(destination_a, relation_type, similarity_score DESC);

CREATE OR REPLACE FUNCTION compute_destination_relationships()
RETURNS void AS $$
BEGIN
  -- Only compute if embedding column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'destinations' 
    AND column_name = 'embedding'
    AND udt_name = 'vector'
  ) THEN
    -- Similar places (based on embeddings)
    INSERT INTO destination_relationships (
      destination_a, destination_b, relation_type, similarity_score
    )
    SELECT 
      d1.id,
      d2.id,
      'similar',
      1 - (d1.embedding <=> d2.embedding)
    FROM destinations d1
    CROSS JOIN destinations d2
    WHERE d1.id < d2.id
      AND d1.embedding IS NOT NULL
      AND d2.embedding IS NOT NULL
      AND d1.category = d2.category
      AND 1 - (d1.embedding <=> d2.embedding) > 0.80
    ON CONFLICT (destination_a, destination_b, relation_type) DO UPDATE
    SET similarity_score = EXCLUDED.similarity_score;
  END IF;
  
  -- Complementary places (from co-visitation)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'co_visit_signals') THEN
    INSERT INTO destination_relationships (
      destination_a, destination_b, relation_type, similarity_score
    )
    SELECT 
      destination_a,
      destination_b,
      'complementary',
      co_visit_score / 10.0 -- Normalize to 0-1 range
    FROM co_visit_signals
    WHERE co_visit_score > 3
    ON CONFLICT (destination_a, destination_b, relation_type) DO UPDATE
    SET similarity_score = EXCLUDED.similarity_score;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERSONALIZATION CACHE
-- ============================================================================

CREATE TABLE IF NOT EXISTS personalization_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cache JSONB,
  cache_key TEXT,
  ttl TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_personalization_cache 
  ON personalization_scores(user_id, cache_key);

-- ============================================================================
-- DISCOVERY PROMPTS ENHANCEMENT (only if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discovery_prompts') THEN
    ALTER TABLE discovery_prompts
      ADD COLUMN IF NOT EXISTS variant_a TEXT,
      ADD COLUMN IF NOT EXISTS variant_b TEXT,
      ADD COLUMN IF NOT EXISTS archetype TEXT,
      ADD COLUMN IF NOT EXISTS city_filter TEXT,
      ADD COLUMN IF NOT EXISTS category_filter TEXT,
      ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0,
      ADD COLUMN IF NOT EXISTS clicks INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS impressions INT DEFAULT 0;

    CREATE INDEX IF NOT EXISTS idx_discovery_context 
      ON discovery_prompts(city_filter, category_filter, archetype);
  END IF;
END $$;

-- ============================================================================
-- FORECASTING DATA
-- ============================================================================

-- Create table if it doesn't exist, or add missing columns if it does
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'forecasting_data'
  ) THEN
    CREATE TABLE forecasting_data (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      destination_id INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
      interest_score FLOAT,
      trend_direction TEXT CHECK (trend_direction IN ('rising', 'falling', 'stable')),
      forecast_date DATE DEFAULT CURRENT_DATE,
      last_updated TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(destination_id, forecast_date)
    );
  ELSE
    ALTER TABLE forecasting_data
      ADD COLUMN IF NOT EXISTS destination_id INTEGER,
      ADD COLUMN IF NOT EXISTS interest_score FLOAT,
      ADD COLUMN IF NOT EXISTS trend_direction TEXT,
      ADD COLUMN IF NOT EXISTS forecast_date DATE DEFAULT CURRENT_DATE,
      ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();
    
    -- Add foreign key if column exists and constraint doesn't
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'forecasting_data' 
      AND column_name = 'destination_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'forecasting_data_destination_id_fkey'
    ) THEN
      ALTER TABLE forecasting_data
        ADD CONSTRAINT forecasting_data_destination_id_fkey
        FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE;
    END IF;
    
    -- Add check constraint if column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'forecasting_data' 
      AND column_name = 'trend_direction'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'forecasting_data_trend_direction_check'
    ) THEN
      ALTER TABLE forecasting_data
        ADD CONSTRAINT forecasting_data_trend_direction_check 
        CHECK (trend_direction IN ('rising', 'falling', 'stable'));
    END IF;
    
    -- Add unique constraint if both columns exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'forecasting_data' 
      AND column_name = 'destination_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'forecasting_data' 
      AND column_name = 'forecast_date'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'forecasting_data_destination_id_forecast_date_key'
    ) THEN
      ALTER TABLE forecasting_data
        ADD CONSTRAINT forecasting_data_destination_id_forecast_date_key
        UNIQUE (destination_id, forecast_date);
    END IF;
  END IF;
  
  -- Create index if columns exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forecasting_data' 
    AND column_name = 'trend_direction'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'forecasting_data' 
    AND column_name = 'interest_score'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_forecasting_trend 
      ON forecasting_data(trend_direction, interest_score DESC);
  END IF;
END $$;

-- ============================================================================
-- OPPORTUNITY ALERTS
-- ============================================================================

-- Create table if it doesn't exist, or add missing columns if it does
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'opportunity_alerts'
  ) THEN
    CREATE TABLE opportunity_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      destination_id INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
      alert_type TEXT CHECK (alert_type IN ('trending', 'price_drop', 'new_opening', 'seasonal')),
      severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
      message TEXT,
      triggered_at TIMESTAMPTZ DEFAULT NOW(),
      read BOOLEAN DEFAULT false
    );
  ELSE
    ALTER TABLE opportunity_alerts
      ADD COLUMN IF NOT EXISTS destination_id INTEGER,
      ADD COLUMN IF NOT EXISTS alert_type TEXT,
      ADD COLUMN IF NOT EXISTS severity TEXT,
      ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
    
    -- Add foreign key if column exists and constraint doesn't
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'opportunity_alerts' 
      AND column_name = 'destination_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'opportunity_alerts_destination_id_fkey'
    ) THEN
      ALTER TABLE opportunity_alerts
        ADD CONSTRAINT opportunity_alerts_destination_id_fkey
        FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE;
    END IF;
    
    -- Add check constraints if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'opportunity_alerts_alert_type_check'
    ) THEN
      ALTER TABLE opportunity_alerts
        ADD CONSTRAINT opportunity_alerts_alert_type_check 
        CHECK (alert_type IN ('trending', 'price_drop', 'new_opening', 'seasonal'));
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'opportunity_alerts_severity_check'
    ) THEN
      ALTER TABLE opportunity_alerts
        ADD CONSTRAINT opportunity_alerts_severity_check 
        CHECK (severity IN ('low', 'medium', 'high'));
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_alerts_user ON opportunity_alerts(user_id, read, triggered_at DESC);

ALTER TABLE opportunity_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own alerts" ON opportunity_alerts;
CREATE POLICY "Users see own alerts" ON opportunity_alerts
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- ENHANCED SEMANTIC SEARCH WITH RANKING (only if embedding exists)
-- ============================================================================

-- Only create function if embedding column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'destinations' 
    AND column_name = 'embedding'
    AND udt_name = 'vector'
  ) THEN
    CREATE OR REPLACE FUNCTION search_destinations_intelligent(
      query_embedding vector(1536),
      user_id_param UUID DEFAULT NULL,
      city_filter TEXT DEFAULT NULL,
      category_filter TEXT DEFAULT NULL,
      open_now_filter BOOLEAN DEFAULT false,
      limit_count INTEGER DEFAULT 20
    ) 
    RETURNS TABLE (
      id INTEGER,
      slug TEXT,
      name TEXT,
      city TEXT,
      category TEXT,
      description TEXT,
      content TEXT,
      image_url TEXT,
      rating NUMERIC,
      price_level INTEGER,
      michelin_stars INTEGER,
      is_open_now BOOLEAN,
      similarity_score FLOAT,
      rank_score FLOAT,
      trending_score FLOAT,
      is_saved BOOLEAN,
      final_score FLOAT
    ) 
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      RETURN QUERY
      SELECT 
        d.id,
        d.slug,
        d.name,
        d.city,
        d.category,
        d.description,
        COALESCE(d.content, d.description) as content,
        COALESCE(d.image, d.main_image) as image_url,
        d.rating,
        d.price_level,
        d.michelin_stars,
        d.is_open_now,
        1 - (d.embedding <=> query_embedding) as similarity_score,
        d.rank_score,
        d.trending_score,
        CASE 
          WHEN user_id_param IS NOT NULL AND EXISTS (
            SELECT 1 FROM saved_places sp 
            WHERE sp.destination_slug = d.slug 
              AND sp.user_id = user_id_param
          ) THEN TRUE
          ELSE FALSE
        END as is_saved,
        -- Blended scoring: semantic (70%) + editorial rank (20%) + trending (10%)
        (1 - (d.embedding <=> query_embedding)) * 0.70 +
        COALESCE(d.rank_score, 0.5) * 0.20 +
        COALESCE(d.trending_score / 10, 0) * 0.10 as final_score
      FROM destinations d
      WHERE 
        d.embedding IS NOT NULL
        AND d.rating >= 4.0 -- Editorial quality threshold
        AND (city_filter IS NULL OR d.city ILIKE '%' || city_filter || '%')
        AND (category_filter IS NULL OR d.category = category_filter)
        AND (NOT open_now_filter OR d.is_open_now = true)
      ORDER BY final_score DESC
      LIMIT limit_count;
    END;
    $$ LANGUAGE plpgsql;
  END IF;
END $$;

-- Helper function to increment views
CREATE OR REPLACE FUNCTION increment_views(dest_id INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE destinations 
  SET views_count = views_count + 1 
  WHERE id = dest_id;
END;
$$ LANGUAGE plpgsql;

-- Helper function to increment saves
CREATE OR REPLACE FUNCTION increment_saves(dest_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE destinations 
  SET saves_count = saves_count + 1 
  WHERE slug = dest_slug;
END;
$$ LANGUAGE plpgsql;

-- Helper function to increment views by slug
CREATE OR REPLACE FUNCTION increment_views_by_slug(dest_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE destinations 
  SET views_count = views_count + 1 
  WHERE slug = dest_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USER INTERACTIONS TABLE
-- ============================================================================

-- Create table if it doesn't exist, or add missing columns if it does
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_interactions'
  ) THEN
    CREATE TABLE user_interactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      destination_id INTEGER REFERENCES destinations(id) ON DELETE CASCADE,
      interaction_type TEXT NOT NULL CHECK (interaction_type IN ('view', 'click', 'save', 'search')),
      engagement_score INTEGER DEFAULT 1,
      context JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  ELSE
    ALTER TABLE user_interactions
      ADD COLUMN IF NOT EXISTS destination_id INTEGER,
      ADD COLUMN IF NOT EXISTS interaction_type TEXT,
      ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS context JSONB,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    
    -- Add foreign key if column exists and constraint doesn't
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_interactions' 
      AND column_name = 'destination_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'user_interactions_destination_id_fkey'
    ) THEN
      ALTER TABLE user_interactions
        ADD CONSTRAINT user_interactions_destination_id_fkey
        FOREIGN KEY (destination_id) REFERENCES destinations(id) ON DELETE CASCADE;
    END IF;
    
    -- Clean up invalid data and add check constraint
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_interactions' 
      AND column_name = 'interaction_type'
    ) THEN
      UPDATE user_interactions
      SET interaction_type = 'view'
      WHERE interaction_type IS NULL 
         OR interaction_type NOT IN ('view', 'click', 'save', 'search');
      
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_interactions_interaction_type_check'
      ) THEN
        ALTER TABLE user_interactions
          ADD CONSTRAINT user_interactions_interaction_type_check 
          CHECK (interaction_type IN ('view', 'click', 'save', 'search'));
      END IF;
    END IF;
  END IF;
  
  -- Create indexes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_interactions' 
    AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_interactions_user 
      ON user_interactions(user_id, created_at DESC);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_interactions' 
    AND column_name = 'destination_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_interactions_destination 
      ON user_interactions(destination_id, created_at DESC);
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_interactions' 
    AND column_name = 'interaction_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_interactions_type 
      ON user_interactions(interaction_type, created_at DESC);
  END IF;
END $$;

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own interactions" ON user_interactions;
CREATE POLICY "Users see own interactions" ON user_interactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own interactions" ON user_interactions;
CREATE POLICY "Users create own interactions" ON user_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMIT;

