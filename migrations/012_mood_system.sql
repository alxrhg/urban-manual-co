-- ================================================
-- Phase 4: Discovery Mood System
-- ================================================
-- Allows users to filter recommendations by mood/intent
-- Maps destinations to moods for contextual discovery
-- ================================================

-- ================================================
-- Mood Taxonomy Table
-- ================================================

CREATE TABLE IF NOT EXISTS mood_taxonomy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mood_key VARCHAR(50) UNIQUE NOT NULL,
  mood_name VARCHAR(100) NOT NULL,
  mood_category VARCHAR(50) NOT NULL, -- 'energy', 'social', 'exploration', 'purpose'
  description TEXT,
  icon VARCHAR(10),
  color_scheme JSONB, -- { "primary": "#hex", "secondary": "#hex" }
  opposite_mood_key VARCHAR(50), -- For mood transitions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard moods
INSERT INTO mood_taxonomy (mood_key, mood_name, mood_category, description, icon, color_scheme) VALUES
-- Energy Level
('energetic', 'Energetic', 'energy', 'Looking for vibrant, high-energy experiences', '⚡', '{"primary": "#FF6B6B", "secondary": "#FFA07A"}'),
('relaxed', 'Relaxed', 'energy', 'Seeking calm, peaceful environments', '🌊', '{"primary": "#4ECDC4", "secondary": "#95E1D3"}'),
('cozy', 'Cozy', 'energy', 'Want comfort and warmth', '☕', '{"primary": "#F38181", "secondary": "#FCE38A"}'),

-- Social Context
('romantic', 'Romantic', 'social', 'Perfect for date nights and intimate moments', '💕', '{"primary": "#FF69B4", "secondary": "#FFB6C1"}'),
('social', 'Social', 'social', 'Great for groups and making memories', '🎉', '{"primary": "#FF6B6B", "secondary": "#FFCC00"}'),
('solo', 'Solo', 'social', 'Best for personal time and reflection', '🧘', '{"primary": "#A8DADC", "secondary": "#457B9D"}'),
('family', 'Family', 'social', 'Family-friendly experiences', '👨‍👩‍👧‍👦', '{"primary": "#98D8C8", "secondary": "#6BCF7F"}'),

-- Exploration Style
('adventurous', 'Adventurous', 'exploration', 'Ready to try something completely new', '🗺️', '{"primary": "#F4A261", "secondary": "#E76F51"}'),
('curious', 'Curious', 'exploration', 'Open to discovery with some familiarity', '🔍', '{"primary": "#2A9D8F", "secondary": "#264653"}'),
('familiar', 'Familiar', 'exploration', 'Prefer tried-and-true favorites', '🏠', '{"primary": "#8D99AE", "secondary": "#2B2D42"}'),

-- Purpose/Intent
('celebration', 'Celebration', 'purpose', 'Marking a special occasion', '🎊', '{"primary": "#FFD700", "secondary": "#FFA500"}'),
('working', 'Working', 'purpose', 'Need a productive environment', '💼', '{"primary": "#457B9D", "secondary": "#1D3557"}'),
('exploring', 'Exploring', 'purpose', 'Tourist mode - seeing the sights', '📸', '{"primary": "#E63946", "secondary": "#F1FAEE"}'),
('local_vibes', 'Local Vibes', 'purpose', 'Experience like a local', '🌆', '{"primary": "#06FFA5", "secondary": "#5E60CE"}'),

-- Special Moods
('inspiring', 'Inspiring', 'purpose', 'Seeking creativity and inspiration', '✨', '{"primary": "#9D4EDD", "secondary": "#C77DFF"}'),
('nostalgic', 'Nostalgic', 'purpose', 'Reminds you of good memories', '📜', '{"primary": "#DDA15E", "secondary": "#BC6C25"}'),
('trendy', 'Trendy', 'exploration', 'What''s popular and buzzing right now', '🔥', '{"primary": "#F72585", "secondary": "#7209B7"}'),
('hidden_gem', 'Hidden Gem', 'exploration', 'Off-the-beaten-path discoveries', '💎', '{"primary": "#4CC9F0", "secondary": "#4361EE"}');

-- Update opposite moods
UPDATE mood_taxonomy SET opposite_mood_key = 'relaxed' WHERE mood_key = 'energetic';
UPDATE mood_taxonomy SET opposite_mood_key = 'energetic' WHERE mood_key = 'relaxed';
UPDATE mood_taxonomy SET opposite_mood_key = 'familiar' WHERE mood_key = 'adventurous';
UPDATE mood_taxonomy SET opposite_mood_key = 'adventurous' WHERE mood_key = 'familiar';
UPDATE mood_taxonomy SET opposite_mood_key = 'solo' WHERE mood_key = 'social';
UPDATE mood_taxonomy SET opposite_mood_key = 'social' WHERE mood_key = 'solo';

-- ================================================
-- Destination Mood Mappings
-- ================================================

CREATE TABLE IF NOT EXISTS destination_moods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination_id INT REFERENCES destinations(id) ON DELETE CASCADE,
  mood_key VARCHAR(50) REFERENCES mood_taxonomy(mood_key) ON DELETE CASCADE,
  strength FLOAT NOT NULL DEFAULT 0.5, -- 0-1, how strongly this mood applies
  confidence FLOAT NOT NULL DEFAULT 0.5, -- 0-1, confidence in this mapping
  source VARCHAR(50) NOT NULL DEFAULT 'auto', -- 'auto', 'manual', 'ai', 'crowd'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(destination_id, mood_key)
);

CREATE INDEX idx_destination_moods_destination ON destination_moods(destination_id);
CREATE INDEX idx_destination_moods_mood ON destination_moods(mood_key);
CREATE INDEX idx_destination_moods_strength ON destination_moods(strength DESC);

-- ================================================
-- User Mood History
-- ================================================

CREATE TABLE IF NOT EXISTS user_mood_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_key VARCHAR(50) REFERENCES mood_taxonomy(mood_key),
  session_id UUID NOT NULL,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_minutes INT, -- How long they browsed in this mood
  interactions_count INT DEFAULT 0, -- Number of destinations viewed
  saved_count INT DEFAULT 0, -- Number saved during this mood session
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_mood_history_user ON user_mood_history(user_id);
CREATE INDEX idx_user_mood_history_mood ON user_mood_history(mood_key);
CREATE INDEX idx_user_mood_history_selected ON user_mood_history(selected_at DESC);

-- ================================================
-- Mood Compatibility Matrix
-- ================================================

CREATE TABLE IF NOT EXISTS mood_compatibility (
  mood_key_a VARCHAR(50) REFERENCES mood_taxonomy(mood_key),
  mood_key_b VARCHAR(50) REFERENCES mood_taxonomy(mood_key),
  compatibility_score FLOAT NOT NULL, -- -1 to 1 (negative = opposite, positive = complementary)
  PRIMARY KEY (mood_key_a, mood_key_b)
);

-- Populate compatibility matrix (examples)
INSERT INTO mood_compatibility (mood_key_a, mood_key_b, compatibility_score) VALUES
-- Energetic compatibilities
('energetic', 'social', 0.8),
('energetic', 'adventurous', 0.9),
('energetic', 'trendy', 0.7),
('energetic', 'relaxed', -0.8),
('energetic', 'cozy', -0.6),

-- Romantic compatibilities
('romantic', 'cozy', 0.8),
('romantic', 'relaxed', 0.6),
('romantic', 'inspiring', 0.7),
('romantic', 'social', -0.4),
('romantic', 'family', -0.7),

-- Adventurous compatibilities
('adventurous', 'curious', 0.7),
('adventurous', 'hidden_gem', 0.9),
('adventurous', 'exploring', 0.8),
('adventurous', 'familiar', -0.9),
('adventurous', 'cozy', -0.5),

-- Solo compatibilities
('solo', 'relaxed', 0.7),
('solo', 'working', 0.6),
('solo', 'inspiring', 0.8),
('solo', 'social', -0.8),
('solo', 'celebration', -0.6);

-- ================================================
-- Helper Functions
-- ================================================

-- Calculate mood score for a destination
CREATE OR REPLACE FUNCTION calculate_mood_score(
  dest_id INT,
  selected_mood VARCHAR(50)
)
RETURNS FLOAT AS $$
DECLARE
  mood_score FLOAT;
  compatibility_bonus FLOAT;
BEGIN
  -- Get direct mood strength
  SELECT COALESCE(strength, 0) INTO mood_score
  FROM destination_moods
  WHERE destination_id = dest_id AND mood_key = selected_mood;

  -- Add compatibility bonus from related moods
  SELECT COALESCE(SUM(
    dm.strength * mc.compatibility_score * 0.3
  ), 0) INTO compatibility_bonus
  FROM destination_moods dm
  JOIN mood_compatibility mc ON dm.mood_key = mc.mood_key_b
  WHERE dm.destination_id = dest_id
    AND mc.mood_key_a = selected_mood
    AND mc.compatibility_score > 0;

  RETURN LEAST(mood_score + compatibility_bonus, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Get top moods for a destination
CREATE OR REPLACE FUNCTION get_destination_moods(dest_id INT)
RETURNS TABLE(
  mood_key VARCHAR(50),
  mood_name VARCHAR(100),
  strength FLOAT,
  icon VARCHAR(10)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dm.mood_key,
    mt.mood_name,
    dm.strength,
    mt.icon
  FROM destination_moods dm
  JOIN mood_taxonomy mt ON dm.mood_key = mt.mood_key
  WHERE dm.destination_id = dest_id
    AND dm.strength >= 0.5
  ORDER BY dm.strength DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Get user's mood preferences
CREATE OR REPLACE FUNCTION get_user_mood_preferences(uid UUID)
RETURNS TABLE(
  mood_key VARCHAR(50),
  frequency INT,
  avg_engagement FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    umh.mood_key,
    COUNT(*)::INT as frequency,
    AVG(umh.interactions_count::FLOAT / NULLIF(umh.duration_minutes, 0))::FLOAT as avg_engagement
  FROM user_mood_history umh
  WHERE umh.user_id = uid
    AND umh.selected_at > NOW() - INTERVAL '90 days'
  GROUP BY umh.mood_key
  ORDER BY frequency DESC;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE mood_taxonomy ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_moods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mood_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_compatibility ENABLE ROW LEVEL SECURITY;

-- Public read for taxonomy and compatibility
CREATE POLICY "Mood taxonomy is public" ON mood_taxonomy FOR SELECT USING (true);
CREATE POLICY "Mood compatibility is public" ON mood_compatibility FOR SELECT USING (true);

-- Public read for destination moods
CREATE POLICY "Destination moods are public" ON destination_moods FOR SELECT USING (true);

-- User mood history: users can read/write their own
CREATE POLICY "Users can read own mood history" ON user_mood_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mood history" ON user_mood_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================
-- Indexes for Performance
-- ================================================

CREATE INDEX idx_mood_taxonomy_category ON mood_taxonomy(mood_category);
CREATE INDEX idx_mood_compatibility_score ON mood_compatibility(compatibility_score DESC);

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE mood_taxonomy IS 'Standardized mood/intent taxonomy for discovery filtering';
COMMENT ON TABLE destination_moods IS 'Maps destinations to applicable moods with strength scores';
COMMENT ON TABLE user_mood_history IS 'Tracks user mood selections over time for personalization';
COMMENT ON TABLE mood_compatibility IS 'Defines relationships between moods (complementary vs opposite)';

COMMENT ON FUNCTION calculate_mood_score IS 'Calculates how well a destination matches a mood, including compatibility bonuses';
COMMENT ON FUNCTION get_destination_moods IS 'Returns top moods for a destination';
COMMENT ON FUNCTION get_user_mood_preferences IS 'Returns user''s most frequent moods and engagement';
