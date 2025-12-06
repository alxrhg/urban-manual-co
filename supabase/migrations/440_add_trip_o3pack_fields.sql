-- Migration: Add O3Pack-inspired fields to trips table
-- Features: trip type, arrival airport, narrative, seasonal intelligence, weather forecast

-- Add trip_type column (leisure or work)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS trip_type VARCHAR(20) DEFAULT NULL;

-- Add arrival_airport column (IATA code like 'JFK', 'LAX')
ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrival_airport VARCHAR(10) DEFAULT NULL;

-- Add narrative column (JSON containing AI-generated trip summary)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS narrative TEXT DEFAULT NULL;

-- Add seasonal_intelligence column (JSON with crowd/timing data)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS seasonal_intelligence TEXT DEFAULT NULL;

-- Add weather_forecast column (JSON with temperature and conditions)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS weather_forecast TEXT DEFAULT NULL;

-- Add check constraint for trip_type values
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_trip_type_check;
ALTER TABLE trips ADD CONSTRAINT trips_trip_type_check
  CHECK (trip_type IS NULL OR trip_type IN ('leisure', 'work'));

-- Add index for trip_type for filtering
CREATE INDEX IF NOT EXISTS idx_trips_trip_type ON trips(trip_type) WHERE trip_type IS NOT NULL;

-- Comment on new columns
COMMENT ON COLUMN trips.trip_type IS 'Type of trip: leisure or work';
COMMENT ON COLUMN trips.arrival_airport IS 'IATA airport code for arrival (e.g., JFK, LAX)';
COMMENT ON COLUMN trips.narrative IS 'JSON: AI-generated trip narrative/summary';
COMMENT ON COLUMN trips.seasonal_intelligence IS 'JSON: Seasonal crowd levels and timing tips';
COMMENT ON COLUMN trips.weather_forecast IS 'JSON: Weather forecast for trip dates';
