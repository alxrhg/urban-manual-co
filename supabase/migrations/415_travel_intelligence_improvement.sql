-- Migration: Create tables for Travel Intelligence Improvement Plan
-- Extended conversation memory, taste profiles, opportunities, multi-day plans

-- User preferences evolution tracking
CREATE TABLE IF NOT EXISTS user_preferences_evolution (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    change_type TEXT NOT NULL, -- 'category_preference', 'city_preference', 'price_range', 'travel_style'
    change_description TEXT NOT NULL,
    confidence FLOAT DEFAULT 0.5,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_evolution_user ON user_preferences_evolution(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_evolution_created ON user_preferences_evolution(created_at DESC);

-- Enhanced conversation sessions (add summary field if not exists)
DO $$ BEGIN
    ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS summary TEXT;
    ALTER TABLE conversation_sessions ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Columns may already exist: %', SQLERRM;
END $$;

-- Opportunity alerts
CREATE TABLE IF NOT EXISTS opportunity_alerts (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    opportunity_type TEXT NOT NULL, -- 'price_drop', 'availability_opening', 'event_alert', 'weather_opportunity'
    destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    value JSONB, -- Store opportunity-specific data
    urgency TEXT DEFAULT 'low', -- 'low', 'medium', 'high'
    expires_at TIMESTAMPTZ,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    notified_at TIMESTAMPTZ,
    is_read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_user ON opportunity_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_destination ON opportunity_alerts(destination_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_urgency ON opportunity_alerts(urgency, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_opportunity_alerts_unread ON opportunity_alerts(user_id, is_read) WHERE is_read = FALSE;

-- Multi-day trip plans
CREATE TABLE IF NOT EXISTS multi_day_trip_plans (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    city TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration_days INT NOT NULL,
    plan_data JSONB NOT NULL, -- Full plan structure
    optimization_metrics JSONB,
    constraints JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_multi_day_trip_plans_user ON multi_day_trip_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_multi_day_trip_plans_city ON multi_day_trip_plans(city);
CREATE INDEX IF NOT EXISTS idx_multi_day_trip_plans_dates ON multi_day_trip_plans(start_date, end_date);

-- Taste profiles cache
CREATE TABLE IF NOT EXISTS user_taste_profiles (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    preferences JSONB NOT NULL,
    contextual_profiles JSONB,
    evolution_summary JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_taste_profiles_user ON user_taste_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_taste_profiles_updated ON user_taste_profiles(last_updated DESC);

COMMENT ON TABLE user_preferences_evolution IS 'Tracks evolution of user preferences over time';
COMMENT ON TABLE opportunity_alerts IS 'Stores detected opportunities (price drops, events, etc.)';
COMMENT ON TABLE multi_day_trip_plans IS 'Stores optimized multi-day trip plans';
COMMENT ON TABLE user_taste_profiles IS 'Cached taste profiles for users';

