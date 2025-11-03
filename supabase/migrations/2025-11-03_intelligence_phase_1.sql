-- Phase 1 Intelligence Migrations
-- Destinations, Co-Visitation, Prompts, Personalization, Forecasting, Alerts, Relationships, Itineraries, Jobs

-- 1) destinations: rank_score, is_open_now
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS rank_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_open_now BOOLEAN DEFAULT false;

-- 2) co_visit_signals
CREATE TABLE IF NOT EXISTS co_visit_signals (
  destination_a UUID REFERENCES destinations(id) ON DELETE CASCADE,
  destination_b UUID REFERENCES destinations(id) ON DELETE CASCADE,
  co_visit_score FLOAT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (destination_a, destination_b)
);

-- 3) discovery_prompts extensions
ALTER TABLE discovery_prompts
  ADD COLUMN IF NOT EXISTS variant_a TEXT,
  ADD COLUMN IF NOT EXISTS variant_b TEXT,
  ADD COLUMN IF NOT EXISTS archetype TEXT,
  ADD COLUMN IF NOT EXISTS city_id UUID,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS clicks INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impressions INT DEFAULT 0;

-- 4) personalization_scores cache & ttl
DO $$ BEGIN
  PERFORM 1 FROM information_schema.columns
    WHERE table_name = 'personalization_scores' AND column_name = 'cache';
  IF NOT FOUND THEN
    ALTER TABLE personalization_scores ADD COLUMN cache JSONB;
  END IF;
END $$;

DO $$ BEGIN
  PERFORM 1 FROM information_schema.columns
    WHERE table_name = 'personalization_scores' AND column_name = 'ttl';
  IF NOT FOUND THEN
    ALTER TABLE personalization_scores ADD COLUMN ttl TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 5) forecasting_data extensions
ALTER TABLE forecasting_data
  ADD COLUMN IF NOT EXISTS interest_score FLOAT,
  ADD COLUMN IF NOT EXISTS trend_direction TEXT,
  ADD COLUMN IF NOT EXISTS last_forecast TIMESTAMP WITH TIME ZONE;

-- 6) opportunity_alerts extensions
ALTER TABLE opportunity_alerts
  ADD COLUMN IF NOT EXISTS alert_type TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- 7) destination_relationships additions
ALTER TABLE destination_relationships
  ADD COLUMN IF NOT EXISTS relation_type TEXT CHECK (relation_type IN ('similar', 'complementary')),
  ADD COLUMN IF NOT EXISTS similarity_score FLOAT;

-- 8) itinerary_templates additions
ALTER TABLE itinerary_templates
  ADD COLUMN IF NOT EXISTS template_type TEXT,
  ADD COLUMN IF NOT EXISTS personalization_weight FLOAT DEFAULT 0.5;

-- 9) jobs_history table
CREATE TABLE IF NOT EXISTS jobs_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT,
  status TEXT,
  run_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_ms INT,
  notes TEXT
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_destinations_rank_score ON destinations(rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_destinations_open_now ON destinations(is_open_now) WHERE is_open_now = true;
CREATE INDEX IF NOT EXISTS idx_co_visit_updated ON co_visit_signals(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_weight ON discovery_prompts(weight DESC);
CREATE INDEX IF NOT EXISTS idx_forecasting_last_forecast ON forecasting_data(last_forecast DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_similarity ON destination_relationships(similarity_score DESC);
