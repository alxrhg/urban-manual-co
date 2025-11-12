BEGIN;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS budget_range JSONB,
  ADD COLUMN IF NOT EXISTS travel_vibes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS mobility_preferences JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS travel_party JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_preferences.budget_range IS 'Structured budget preferences captured from traveler profile';
COMMENT ON COLUMN user_preferences.travel_vibes IS 'Preferred ambience or vibe tags for future trips';
COMMENT ON COLUMN user_preferences.mobility_preferences IS 'Mobility or accessibility needs for the traveler';
COMMENT ON COLUMN user_preferences.travel_party IS 'Frequent travel party compositions (solo, couple, family, etc.)';

COMMIT;
