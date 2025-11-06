-- ================================================
-- Phase 5: Cold-Start Solution
-- ================================================
-- Helps new users without interaction history get
-- personalized recommendations through onboarding
-- ================================================

-- ================================================
-- Onboarding Responses
-- ================================================

CREATE TABLE IF NOT EXISTS onboarding_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Cuisine Preferences (multi-select)
  preferred_cuisines TEXT[], -- e.g., ['italian', 'japanese', 'mexican']
  avoided_cuisines TEXT[],

  -- Price Preferences
  typical_budget INT, -- 1-4 scale
  splurge_willingness FLOAT, -- 0-1, how often they splurge

  -- Ambiance Preferences
  preferred_ambiance TEXT[], -- ['cozy', 'vibrant', 'quiet', 'romantic']
  formality_preference FLOAT, -- 0-1, casual to formal

  -- Social Context
  primary_dining_context TEXT, -- 'solo', 'couples', 'groups', 'family'
  group_size_preference INT, -- Average group size

  -- Exploration Style
  novelty_seeking FLOAT, -- 0-1, familiar to adventurous
  tourist_vs_local FLOAT, -- 0-1, tourist spots to local gems

  -- Dietary Restrictions
  dietary_restrictions TEXT[], -- ['vegetarian', 'vegan', 'gluten-free', 'halal']

  -- Special Interests
  interests TEXT[], -- ['art', 'history', 'architecture', 'nature', 'nightlife']

  -- Travel Context (optional)
  travel_frequency VARCHAR(50), -- 'rarely', 'occasionally', 'frequently', 'constantly'
  preferred_travel_style VARCHAR(50), -- 'luxury', 'budget', 'mid-range', 'backpacker'

  -- Mood Preferences
  favorite_moods TEXT[], -- Selected from mood taxonomy

  -- Meta
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  onboarding_version VARCHAR(20) DEFAULT '1.0',
  time_spent_seconds INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_onboarding_responses_user ON onboarding_responses(user_id);
CREATE INDEX idx_onboarding_responses_completed ON onboarding_responses(completed_at DESC);

-- ================================================
-- Onboarding Question Bank
-- ================================================

CREATE TABLE IF NOT EXISTS onboarding_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_key VARCHAR(100) UNIQUE NOT NULL,
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- 'multi_select', 'single_select', 'scale', 'ranking'
  category VARCHAR(50) NOT NULL, -- 'cuisine', 'ambiance', 'budget', 'style', 'mood'
  options JSONB, -- Array of options for select/ranking questions
  required BOOLEAN DEFAULT true,
  order_index INT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert standard onboarding questions
INSERT INTO onboarding_questions (question_key, question_text, question_type, category, options, order_index) VALUES

-- Cuisine Preferences (Q1)
('preferred_cuisines', 'Which cuisines do you love?', 'multi_select', 'cuisine',
  '["italian", "japanese", "mexican", "french", "indian", "chinese", "thai", "mediterranean", "american", "korean", "vietnamese", "greek", "spanish", "middle_eastern", "fusion"]'::jsonb, 1),

-- Budget (Q2)
('typical_budget', 'What''s your typical dining budget?', 'single_select', 'budget',
  '[
    {"value": 1, "label": "Budget-friendly ($)", "description": "Under $15 per person"},
    {"value": 2, "label": "Moderate ($$)", "description": "$15-30 per person"},
    {"value": 3, "label": "Upscale ($$$)", "description": "$30-60 per person"},
    {"value": 4, "label": "Fine Dining ($$$$)", "description": "$60+ per person"}
  ]'::jsonb, 2),

-- Ambiance (Q3)
('preferred_ambiance', 'What kind of atmosphere do you prefer?', 'multi_select', 'ambiance',
  '["cozy", "vibrant", "quiet", "romantic", "lively", "elegant", "casual", "modern", "rustic", "intimate"]'::jsonb, 3),

-- Dining Context (Q4)
('primary_dining_context', 'Who do you usually dine with?', 'single_select', 'style',
  '[
    {"value": "solo", "label": "Solo", "icon": "🧘"},
    {"value": "couples", "label": "Partner/Date", "icon": "💕"},
    {"value": "groups", "label": "Friends/Groups", "icon": "🎉"},
    {"value": "family", "label": "Family", "icon": "👨‍👩‍👧‍👦"}
  ]'::jsonb, 4),

-- Exploration Style (Q5)
('novelty_seeking', 'How adventurous are you with food?', 'scale', 'style',
  '{
    "min": 0,
    "max": 10,
    "min_label": "Stick to favorites",
    "max_label": "Love trying new things"
  }'::jsonb, 5),

-- Tourist vs Local (Q6)
('tourist_vs_local', 'When exploring a city, you prefer...', 'single_select', 'style',
  '[
    {"value": 0, "label": "Popular tourist spots", "icon": "📸"},
    {"value": 0.5, "label": "Mix of both", "icon": "🗺️"},
    {"value": 1, "label": "Hidden local gems", "icon": "💎"}
  ]'::jsonb, 6),

-- Dietary Restrictions (Q7)
('dietary_restrictions', 'Any dietary restrictions?', 'multi_select', 'cuisine',
  '["none", "vegetarian", "vegan", "gluten_free", "dairy_free", "nut_free", "halal", "kosher", "pescatarian"]'::jsonb, 7),

-- Interests (Q8)
('interests', 'What interests you most?', 'multi_select', 'style',
  '["art_culture", "history", "architecture", "nature_outdoors", "nightlife", "shopping", "wellness", "sports", "music", "photography"]'::jsonb, 8),

-- Favorite Moods (Q9)
('favorite_moods', 'Select your go-to moods', 'multi_select', 'mood',
  '["romantic", "energetic", "relaxed", "cozy", "social", "adventurous", "inspiring", "trendy", "local_vibes"]'::jsonb, 9);

-- ================================================
-- Bootstrap Taste Profile from Onboarding
-- ================================================

CREATE OR REPLACE FUNCTION bootstrap_taste_profile_from_onboarding(uid UUID)
RETURNS VOID AS $$
DECLARE
  onboarding RECORD;
  cuisine_prefs JSONB := '{}'::jsonb;
  cuisine TEXT;
BEGIN
  -- Get onboarding responses
  SELECT * INTO onboarding FROM onboarding_responses WHERE user_id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No onboarding responses found for user %', uid;
  END IF;

  -- Build cuisine preferences
  FOREACH cuisine IN ARRAY onboarding.preferred_cuisines
  LOOP
    cuisine_prefs := cuisine_prefs || jsonb_build_object(cuisine, 5); -- Start with weight of 5
  END LOOP;

  -- Insert or update taste profile
  INSERT INTO taste_profiles (
    user_id,
    cuisine_preferences,
    avg_price_point,
    novelty_seeking,
    formality_preference,
    michelin_affinity,
    confidence_score,
    interaction_count,
    created_at,
    updated_at
  ) VALUES (
    uid,
    cuisine_prefs,
    COALESCE(onboarding.typical_budget, 2.5),
    COALESCE(onboarding.novelty_seeking, 0.5),
    COALESCE(onboarding.formality_preference, 0.5),
    CASE WHEN onboarding.typical_budget >= 3 THEN 0.6 ELSE 0.3 END, -- Higher budget = higher Michelin affinity
    0.4, -- Bootstrap confidence (lower than interaction-based)
    0, -- No interactions yet
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    cuisine_preferences = EXCLUDED.cuisine_preferences,
    avg_price_point = EXCLUDED.avg_price_point,
    novelty_seeking = EXCLUDED.novelty_seeking,
    formality_preference = EXCLUDED.formality_preference,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Get Onboarding Progress
-- ================================================

CREATE OR REPLACE FUNCTION get_onboarding_progress(uid UUID)
RETURNS TABLE(
  completed BOOLEAN,
  total_questions INT,
  answered_questions INT,
  progress_percentage FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXISTS(SELECT 1 FROM onboarding_responses WHERE user_id = uid) as completed,
    COUNT(*)::INT as total_questions,
    CASE WHEN EXISTS(SELECT 1 FROM onboarding_responses WHERE user_id = uid)
      THEN COUNT(*)::INT
      ELSE 0
    END as answered_questions,
    CASE WHEN EXISTS(SELECT 1 FROM onboarding_responses WHERE user_id = uid)
      THEN 100.0
      ELSE 0.0
    END as progress_percentage
  FROM onboarding_questions
  WHERE active = true;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- Row Level Security
-- ================================================

ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own onboarding responses
CREATE POLICY "Users can read own onboarding responses" ON onboarding_responses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding responses" ON onboarding_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding responses" ON onboarding_responses
  FOR UPDATE USING (auth.uid() = user_id);

-- Onboarding questions are public (read-only)
CREATE POLICY "Onboarding questions are public" ON onboarding_questions
  FOR SELECT USING (active = true);

-- ================================================
-- Indexes for Performance
-- ================================================

CREATE INDEX idx_onboarding_questions_active ON onboarding_questions(active, order_index);
CREATE INDEX idx_onboarding_questions_category ON onboarding_questions(category);

-- ================================================
-- Comments
-- ================================================

COMMENT ON TABLE onboarding_responses IS 'Stores user responses from onboarding questionnaire for cold-start recommendations';
COMMENT ON TABLE onboarding_questions IS 'Question bank for onboarding flow, configurable and versionable';
COMMENT ON FUNCTION bootstrap_taste_profile_from_onboarding IS 'Creates initial taste profile from onboarding responses';
COMMENT ON FUNCTION get_onboarding_progress IS 'Returns user onboarding completion status and progress';
