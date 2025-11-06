-- ================================================
-- Phase 7: Best Time to Visit Predictions
-- ================================================
-- Predicts optimal visiting times based on weather,
-- crowds, seasonality, and historical patterns
-- ================================================

-- ================================================
-- Best Time Data
-- ================================================

CREATE TABLE IF NOT EXISTS destination_best_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE UNIQUE,

  -- Monthly data (1-12)
  best_months INT[], -- [4, 5, 9, 10] for Apr, May, Sep, Oct
  worst_months INT[],
  shoulder_months INT[], -- Good but not peak

  -- Weekly data (0-6, Sunday-Saturday)
  best_days INT[], -- [1, 2, 3] for Mon-Wed
  worst_days INT[], -- [5, 6] for Fri-Sat

  -- Hourly data (0-23)
  best_hours INT[], -- [9, 10, 11] for morning
  worst_hours INT[], -- [12, 13, 14] for lunch rush
  
  -- Seasonal insights
  peak_season_start DATE,
  peak_season_end DATE,
  off_season_start DATE,
  off_season_end DATE,

  -- Crowd levels by month (1-10 scale)
  crowd_levels_by_month JSONB, -- {"1": 3, "2": 2, "3": 4, ...}
  
  -- Weather suitability by month (0-1 score)
  weather_scores_by_month JSONB, -- {"1": 0.4, "2": 0.5, ...}

  -- Reasons
  best_time_reason TEXT,
  worst_time_reason TEXT,

  -- Meta
  confidence FLOAT DEFAULT 0.5, -- 0-1
  data_source VARCHAR(50) DEFAULT 'computed', -- 'computed', 'manual', 'ml'
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_destination_best_times_destination ON destination_best_times(destination_id);

-- ================================================
-- Historical Visit Data
-- ================================================

CREATE TABLE IF NOT EXISTS destination_visit_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  
  -- Time dimensions
  year INT NOT NULL,
  month INT NOT NULL, -- 1-12
  day_of_week INT, -- 0-6
  hour INT, -- 0-23
  
  -- Metrics
  estimated_visitors INT, -- Estimated visitor count
  crowd_level INT, -- 1-10 scale
  wait_time_minutes INT, -- Average wait time
  
  -- Weather context
  avg_temperature FLOAT,
  avg_precipitation FLOAT,
  weather_condition VARCHAR(50),
  
  -- Source
  data_source VARCHAR(50) DEFAULT 'aggregated',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(destination_id, year, month, day_of_week, hour)
);

CREATE INDEX idx_visit_patterns_destination ON destination_visit_patterns(destination_id);
CREATE INDEX idx_visit_patterns_month ON destination_visit_patterns(month);
CREATE INDEX idx_visit_patterns_day_of_week ON destination_visit_patterns(day_of_week);

-- ================================================
-- User Visit History
-- ================================================

CREATE TABLE IF NOT EXISTS user_visit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  
  -- Visit details
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INT,
  
  -- User ratings
  crowd_rating INT, -- 1-5
  experience_rating INT, -- 1-5
  would_visit_again BOOLEAN,
  
  -- Context
  visit_purpose VARCHAR(50), -- 'leisure', 'business', 'event'
  group_size INT,
  weather_condition VARCHAR(50),
  
  -- Feedback
  feedback_text TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_visit_history_user ON user_visit_history(user_id);
CREATE INDEX idx_user_visit_history_destination ON user_visit_history(destination_id);
CREATE INDEX idx_user_visit_history_visited_at ON user_visit_history(visited_at DESC);

-- ================================================
-- Helper Functions
-- ================================================

-- Get current month number
CREATE OR REPLACE FUNCTION get_current_month()
RETURNS INT AS $$
BEGIN
  RETURN EXTRACT(MONTH FROM CURRENT_DATE)::INT;
END;
$$ LANGUAGE plpgsql;

-- Get current day of week
CREATE OR REPLACE FUNCTION get_current_day_of_week()
RETURNS INT AS $$
BEGIN
  RETURN EXTRACT(DOW FROM CURRENT_DATE)::INT;
END;
$$ LANGUAGE plpgsql;

-- Get current hour
CREATE OR REPLACE FUNCTION get_current_hour()
RETURNS INT AS $$
BEGIN
  RETURN EXTRACT(HOUR FROM CURRENT_TIMESTAMP)::INT;
END;
$$ LANGUAGE plpgsql;

-- Calculate time score for destination
CREATE OR REPLACE FUNCTION calculate_time_score(
  dest_id INT,
  check_month INT DEFAULT NULL,
  check_day INT DEFAULT NULL,
  check_hour INT DEFAULT NULL
)
RETURNS FLOAT AS $$
DECLARE
  best_time RECORD;
  score FLOAT := 0.5; -- Start neutral
  month_to_check INT;
  day_to_check INT;
  hour_to_check INT;
BEGIN
  -- Use current time if not specified
  month_to_check := COALESCE(check_month, get_current_month());
  day_to_check := COALESCE(check_day, get_current_day_of_week());
  hour_to_check := COALESCE(check_hour, get_current_hour());

  -- Get best time data
  SELECT * INTO best_time FROM destination_best_times WHERE destination_id = dest_id;

  IF NOT FOUND THEN
    RETURN score; -- No data, return neutral
  END IF;

  -- Check month
  IF best_time.best_months IS NOT NULL AND month_to_check = ANY(best_time.best_months) THEN
    score := score + 0.3;
  ELSIF best_time.worst_months IS NOT NULL AND month_to_check = ANY(best_time.worst_months) THEN
    score := score - 0.3;
  ELSIF best_time.shoulder_months IS NOT NULL AND month_to_check = ANY(best_time.shoulder_months) THEN
    score := score + 0.1;
  END IF;

  -- Check day of week
  IF best_time.best_days IS NOT NULL AND day_to_check = ANY(best_time.best_days) THEN
    score := score + 0.15;
  ELSIF best_time.worst_days IS NOT NULL AND day_to_check = ANY(best_time.worst_days) THEN
    score := score - 0.15;
  END IF;

  -- Check hour
  IF best_time.best_hours IS NOT NULL AND hour_to_check = ANY(best_time.best_hours) THEN
    score := score + 0.15;
  ELSIF best_time.worst_hours IS NOT NULL AND hour_to_check = ANY(best_time.worst_hours) THEN
    score := score - 0.15;
  END IF;

  -- Clamp between 0 and 1
  RETURN GREATEST(0, LEAST(1, score));
END;
$$ LANGUAGE plpgsql;

-- Get best time to visit destination
CREATE OR REPLACE FUNCTION get_best_time_to_visit(dest_id INT)
RETURNS TABLE(
  time_type VARCHAR(20),
  best_value TEXT,
  score FLOAT,
  reason TEXT
) AS $$
DECLARE
  best_time RECORD;
BEGIN
  SELECT * INTO best_time FROM destination_best_times WHERE destination_id = dest_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Best months
  IF best_time.best_months IS NOT NULL AND array_length(best_time.best_months, 1) > 0 THEN
    RETURN QUERY SELECT
      'month'::VARCHAR(20),
      array_to_string(best_time.best_months, ','),
      0.9::FLOAT,
      COALESCE(best_time.best_time_reason, 'Optimal weather and crowds');
  END IF;

  -- Best days
  IF best_time.best_days IS NOT NULL AND array_length(best_time.best_days, 1) > 0 THEN
    RETURN QUERY SELECT
      'day'::VARCHAR(20),
      array_to_string(best_time.best_days, ','),
      0.85::FLOAT,
      'Fewer crowds'::TEXT;
  END IF;

  -- Best hours
  IF best_time.best_hours IS NOT NULL AND array_length(best_time.best_hours, 1) > 0 THEN
    RETURN QUERY SELECT
      'hour'::VARCHAR(20),
      array_to_string(best_time.best_hours, ','),
      0.8::FLOAT,
      'Less busy times'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE destination_best_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_visit_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_visit_history ENABLE ROW LEVEL SECURITY;

-- Public read for best times
CREATE POLICY "Best times are public" ON destination_best_times
  FOR SELECT USING (true);

-- Public read for visit patterns
CREATE POLICY "Visit patterns are public" ON destination_visit_patterns
  FOR SELECT USING (true);

-- Users can read/write their own visit history
CREATE POLICY "Users can read own visit history" ON user_visit_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own visit history" ON user_visit_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own visit history" ON user_visit_history
  FOR UPDATE USING (auth.uid() = user_id);

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE destination_best_times IS 'Optimal visiting times for each destination';
COMMENT ON TABLE destination_visit_patterns IS 'Historical visit patterns and crowd data';
COMMENT ON TABLE user_visit_history IS 'User visit history and feedback';

COMMENT ON FUNCTION calculate_time_score IS 'Calculates timing appropriateness score for current or specified time';
COMMENT ON FUNCTION get_best_time_to_visit IS 'Returns recommended visiting times with reasons';
