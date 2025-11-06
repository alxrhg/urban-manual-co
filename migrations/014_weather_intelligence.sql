-- ================================================
-- Phase 6: Weather Intelligence Integration
-- ================================================
-- Weather-aware recommendations based on current
-- conditions and seasonal preferences
-- ================================================

-- ================================================
-- Destination Weather Preferences
-- ================================================

CREATE TABLE IF NOT EXISTS destination_weather_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,

  -- Optimal weather conditions
  ideal_temperature_min FLOAT, -- Celsius
  ideal_temperature_max FLOAT,
  ideal_weather_conditions TEXT[], -- ['sunny', 'partly_cloudy', 'clear']
  avoid_weather_conditions TEXT[], -- ['rain', 'snow', 'extreme_heat']

  -- Seasonal preferences
  best_seasons TEXT[], -- ['spring', 'summer', 'fall', 'winter']
  worst_seasons TEXT[],

  -- Weather impact
  weather_dependent BOOLEAN DEFAULT false, -- True for outdoor destinations
  indoor_alternative_available BOOLEAN DEFAULT false,

  -- Special conditions
  requires_good_visibility BOOLEAN DEFAULT false, -- Viewpoints, scenic spots
  heat_sensitive BOOLEAN DEFAULT false, -- Ice cream shops, outdoor markets
  cold_sensitive BOOLEAN DEFAULT false, -- Beach clubs, outdoor pools

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(destination_id)
);

CREATE INDEX idx_destination_weather_destination ON destination_weather_preferences(destination_id);
CREATE INDEX idx_destination_weather_dependent ON destination_weather_preferences(weather_dependent);

-- ================================================
-- Weather Cache
-- ================================================

CREATE TABLE IF NOT EXISTS weather_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city VARCHAR(255) NOT NULL,
  country VARCHAR(100),

  -- Current weather
  temperature FLOAT, -- Celsius
  feels_like FLOAT,
  weather_condition VARCHAR(50), -- 'sunny', 'cloudy', 'rain', 'snow', etc.
  weather_description TEXT,
  humidity INT, -- Percentage
  wind_speed FLOAT, -- m/s
  precipitation_probability INT, -- Percentage

  -- Additional data
  sunrise TIMESTAMP WITH TIME ZONE,
  sunset TIMESTAMP WITH TIME ZONE,
  uv_index FLOAT,

  -- Meta
  source VARCHAR(50) DEFAULT 'openweathermap', -- API source
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(city, country)
);

CREATE INDEX idx_weather_cache_city ON weather_cache(city);
CREATE INDEX idx_weather_cache_expires ON weather_cache(expires_at);

-- ================================================
-- User Weather Preferences
-- ================================================

CREATE TABLE IF NOT EXISTS user_weather_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Temperature preferences
  preferred_temp_min FLOAT DEFAULT 15, -- Celsius
  preferred_temp_max FLOAT DEFAULT 28,

  -- Conditions
  enjoy_rain BOOLEAN DEFAULT false,
  enjoy_snow BOOLEAN DEFAULT false,
  heat_tolerant BOOLEAN DEFAULT true,
  cold_tolerant BOOLEAN DEFAULT false,

  -- Activity preferences by weather
  rainy_day_preferences TEXT[], -- ['museums', 'indoor_dining', 'bars']
  sunny_day_preferences TEXT[], -- ['parks', 'outdoor_dining', 'beaches']

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_weather_preferences_user ON user_weather_preferences(user_id);

-- ================================================
-- Weather-Based Recommendation Logs
-- ================================================

CREATE TABLE IF NOT EXISTS weather_recommendation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,

  -- Weather context
  weather_condition VARCHAR(50),
  temperature FLOAT,
  weather_score FLOAT, -- 0-1, how well weather matches destination

  -- Recommendation decision
  recommended BOOLEAN,
  boost_applied FLOAT, -- Score boost/penalty applied
  reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_weather_rec_logs_user ON weather_recommendation_logs(user_id);
CREATE INDEX idx_weather_rec_logs_created ON weather_recommendation_logs(created_at DESC);

-- ================================================
-- Helper Functions
-- ================================================

-- Get current season for a location
CREATE OR REPLACE FUNCTION get_current_season(lat FLOAT, current_date DATE DEFAULT CURRENT_DATE)
RETURNS VARCHAR(10) AS $$
DECLARE
  month INT := EXTRACT(MONTH FROM current_date);
  is_northern BOOLEAN := lat >= 0;
BEGIN
  IF is_northern THEN
    -- Northern hemisphere
    IF month IN (12, 1, 2) THEN RETURN 'winter';
    ELSIF month IN (3, 4, 5) THEN RETURN 'spring';
    ELSIF month IN (6, 7, 8) THEN RETURN 'summer';
    ELSE RETURN 'fall';
    END IF;
  ELSE
    -- Southern hemisphere
    IF month IN (12, 1, 2) THEN RETURN 'summer';
    ELSIF month IN (3, 4, 5) THEN RETURN 'fall';
    ELSIF month IN (6, 7, 8) THEN RETURN 'winter';
    ELSE RETURN 'spring';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Calculate weather match score for destination
CREATE OR REPLACE FUNCTION calculate_weather_score(
  dest_id INT,
  current_temp FLOAT,
  current_condition VARCHAR(50)
)
RETURNS FLOAT AS $$
DECLARE
  prefs RECORD;
  score FLOAT := 0.7; -- Default neutral score
BEGIN
  -- Get destination weather preferences
  SELECT * INTO prefs FROM destination_weather_preferences WHERE destination_id = dest_id;

  IF NOT FOUND THEN
    RETURN score; -- No preferences, return neutral
  END IF;

  -- Check if weather-dependent
  IF NOT prefs.weather_dependent THEN
    RETURN 0.9; -- Indoor destination, weather doesn't matter much
  END IF;

  -- Check temperature range
  IF prefs.ideal_temperature_min IS NOT NULL AND current_temp < prefs.ideal_temperature_min THEN
    score := score - 0.2;
  END IF;

  IF prefs.ideal_temperature_max IS NOT NULL AND current_temp > prefs.ideal_temperature_max THEN
    score := score - 0.2;
  END IF;

  -- Check ideal conditions
  IF prefs.ideal_weather_conditions IS NOT NULL AND current_condition = ANY(prefs.ideal_weather_conditions) THEN
    score := score + 0.2;
  END IF;

  -- Check conditions to avoid
  IF prefs.avoid_weather_conditions IS NOT NULL AND current_condition = ANY(prefs.avoid_weather_conditions) THEN
    score := score - 0.3;
  END IF;

  -- Clamp between 0 and 1
  RETURN GREATEST(0, LEAST(1, score));
END;
$$ LANGUAGE plpgsql;

-- Get weather-appropriate destinations
CREATE OR REPLACE FUNCTION get_weather_appropriate_destinations(
  city_name VARCHAR(255),
  limit_count INT DEFAULT 20
)
RETURNS TABLE(
  destination_id INT,
  weather_score FLOAT
) AS $$
DECLARE
  current_weather RECORD;
BEGIN
  -- Get current weather
  SELECT * INTO current_weather FROM weather_cache
  WHERE city = city_name AND expires_at > NOW()
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No weather data found for city: %', city_name;
  END IF;

  -- Return destinations with weather scores
  RETURN QUERY
  SELECT
    d.id as destination_id,
    calculate_weather_score(d.id, current_weather.temperature, current_weather.weather_condition) as weather_score
  FROM destinations d
  WHERE d.city = city_name
  ORDER BY weather_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE destination_weather_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weather_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_recommendation_logs ENABLE ROW LEVEL SECURITY;

-- Public read for destination weather preferences
CREATE POLICY "Destination weather preferences are public" ON destination_weather_preferences
  FOR SELECT USING (true);

-- Public read for weather cache
CREATE POLICY "Weather cache is public" ON weather_cache
  FOR SELECT USING (true);

-- Users can read/write their own weather preferences
CREATE POLICY "Users can read own weather preferences" ON user_weather_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weather preferences" ON user_weather_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weather preferences" ON user_weather_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can read their own recommendation logs
CREATE POLICY "Users can read own weather rec logs" ON weather_recommendation_logs
  FOR SELECT USING (auth.uid() = user_id);

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE destination_weather_preferences IS 'Weather preferences and optimal conditions for each destination';
COMMENT ON TABLE weather_cache IS 'Cached weather data from external APIs';
COMMENT ON TABLE user_weather_preferences IS 'User preferences for weather-based recommendations';
COMMENT ON TABLE weather_recommendation_logs IS 'Logs of weather-based recommendation decisions';

COMMENT ON FUNCTION get_current_season IS 'Returns current season based on latitude and date';
COMMENT ON FUNCTION calculate_weather_score IS 'Calculates how well current weather matches destination preferences';
COMMENT ON FUNCTION get_weather_appropriate_destinations IS 'Returns destinations sorted by weather appropriateness';
