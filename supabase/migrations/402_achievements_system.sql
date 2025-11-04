-- Migration 402: Achievements System
-- Gamification: Track user achievements and badges

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  icon TEXT, -- Emoji or icon identifier
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 100, -- Percentage of completion (100 = fully unlocked)
  metadata JSONB, -- Store any additional data (e.g., specific count when unlocked)
  UNIQUE(user_id, achievement_code)
);

-- Achievement definitions (what achievements exist)
CREATE TABLE IF NOT EXISTS achievement_definitions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'travel', 'food', 'social', 'collection', etc.
  tier TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'count', 'specific', 'consecutive', etc.
  requirement_value INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_code ON user_achievements(achievement_code);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at ON user_achievements(unlocked_at DESC);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_category ON achievement_definitions(category);
CREATE INDEX IF NOT EXISTS idx_achievement_definitions_tier ON achievement_definitions(tier);

-- RLS policies
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY user_achievements_select_own ON user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view other users' achievements (for social features)
CREATE POLICY user_achievements_select_all ON user_achievements
  FOR SELECT
  USING (true);

-- Only system can insert achievements (via functions)
-- CREATE POLICY user_achievements_insert ON user_achievements
--   FOR INSERT
--   WITH CHECK (false); -- Will be done via serverless functions

-- Everyone can view achievement definitions
CREATE POLICY achievement_definitions_select_all ON achievement_definitions
  FOR SELECT
  USING (true);

-- Insert default achievement definitions
INSERT INTO achievement_definitions (code, name, description, icon, category, tier, requirement_type, requirement_value) VALUES
  -- Travel Achievements
  ('first_place', 'First Place', 'Mark your first place as visited', '🎉', 'travel', 'bronze', 'count', 1),
  ('explorer_5', 'Explorer', 'Visit 5 different places', '🗺️', 'travel', 'bronze', 'count', 5),
  ('explorer_25', 'Seasoned Traveler', 'Visit 25 different places', '✈️', 'travel', 'silver', 'count', 25),
  ('explorer_50', 'World Explorer', 'Visit 50 different places', '🌍', 'travel', 'gold', 'count', 50),
  ('explorer_100', 'Travel Master', 'Visit 100 different places', '🏆', 'travel', 'platinum', 'count', 100),

  -- City Achievements
  ('city_hopper_3', 'City Hopper', 'Visit places in 3 different cities', '🏙️', 'travel', 'bronze', 'count', 3),
  ('city_hopper_10', 'Urban Explorer', 'Visit places in 10 different cities', '🌆', 'travel', 'silver', 'count', 10),
  ('city_hopper_25', 'Metropolis Master', 'Visit places in 25 different cities', '🗼', 'travel', 'gold', 'count', 25),

  -- Country Achievements
  ('countries_3', 'Continental', 'Visit 3 different countries', '🌎', 'travel', 'bronze', 'count', 3),
  ('countries_10', 'Globetrotter', 'Visit 10 different countries', '🌏', 'travel', 'silver', 'count', 10),
  ('countries_25', 'World Citizen', 'Visit 25 different countries', '🌐', 'travel', 'gold', 'count', 25),

  -- Food Achievements
  ('foodie_10', 'Foodie', 'Visit 10 restaurants', '🍽️', 'food', 'bronze', 'count', 10),
  ('foodie_50', 'Culinary Explorer', 'Visit 50 restaurants', '👨‍🍳', 'food', 'silver', 'count', 50),
  ('michelin_hunter', 'Michelin Hunter', 'Visit 5 Michelin-starred restaurants', '⭐', 'food', 'gold', 'count', 5),
  ('michelin_master', 'Michelin Master', 'Visit 10 Michelin-starred restaurants', '⭐⭐', 'food', 'platinum', 'count', 10),

  -- Category Achievements
  ('coffee_lover', 'Coffee Connoisseur', 'Visit 10 cafes', '☕', 'food', 'bronze', 'count', 10),
  ('bar_regular', 'Bar Regular', 'Visit 10 bars', '🍸', 'food', 'bronze', 'count', 10),
  ('hotel_expert', 'Hotel Expert', 'Visit 5 hotels', '🏨', 'travel', 'silver', 'count', 5),

  -- Crown Achievements
  ('crown_collector', 'Crown Collector', 'Visit 3 Crown destinations', '👑', 'travel', 'gold', 'count', 3),
  ('crown_master', 'Crown Master', 'Visit 10 Crown destinations', '👑👑', 'travel', 'platinum', 'count', 10),

  -- Collection Achievements
  ('list_creator', 'List Creator', 'Create your first collection', '📋', 'collection', 'bronze', 'count', 1),
  ('curator', 'Curator', 'Create 5 collections', '📚', 'collection', 'silver', 'count', 5),
  ('organized_traveler', 'Organized Traveler', 'Create 10 collections', '🗂️', 'collection', 'gold', 'count', 10),

  -- Social Achievements
  ('social_butterfly', 'Social Butterfly', 'Follow 5 travelers', '🦋', 'social', 'bronze', 'count', 5),
  ('influencer', 'Influencer', 'Have 10 followers', '🌟', 'social', 'silver', 'count', 10),
  ('travel_guru', 'Travel Guru', 'Have 50 followers', '👨‍🏫', 'social', 'gold', 'count', 50),

  -- Engagement Achievements
  ('documenter', 'Documenter', 'Add photos to 5 visited places', '📸', 'engagement', 'bronze', 'count', 5),
  ('storyteller', 'Storyteller', 'Add notes to 10 visited places', '📝', 'engagement', 'silver', 'count', 10),
  ('planner', 'Planner', 'Create your first itinerary', '🗓️', 'engagement', 'bronze', 'count', 1)
ON CONFLICT (code) DO NOTHING;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS SETOF user_achievements AS $$
DECLARE
  v_visited_count INTEGER;
  v_cities_count INTEGER;
  v_countries_count INTEGER;
  v_restaurants_count INTEGER;
  v_cafes_count INTEGER;
  v_bars_count INTEGER;
  v_hotels_count INTEGER;
  v_michelin_count INTEGER;
  v_crown_count INTEGER;
  v_collections_count INTEGER;
  v_photos_count INTEGER;
  v_notes_count INTEGER;
  v_achievement RECORD;
BEGIN
  -- Get user stats
  SELECT COUNT(DISTINCT destination_slug) INTO v_visited_count
  FROM visited_places WHERE user_id = p_user_id;

  SELECT COUNT(DISTINCT d.city) INTO v_cities_count
  FROM visited_places vp
  JOIN destinations d ON d.slug = vp.destination_slug
  WHERE vp.user_id = p_user_id;

  -- Award achievements based on criteria
  -- This is a simplified version - full implementation would check each achievement

  RETURN QUERY
  SELECT * FROM user_achievements WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT ALL ON user_achievements TO authenticated;
GRANT SELECT ON achievement_definitions TO authenticated;

COMMENT ON TABLE user_achievements IS 'Tracks which achievements users have unlocked';
COMMENT ON TABLE achievement_definitions IS 'Defines all available achievements in the system';
