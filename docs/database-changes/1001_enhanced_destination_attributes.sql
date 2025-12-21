-- Migration 1001: Enhanced Destination Attributes for AI Response Improvements
-- Adds structured attributes to support better query matching and response generation

BEGIN;

-- ============================================================================
-- ENHANCED DESTINATION ATTRIBUTES
-- ============================================================================

-- Add new columns to destinations table for structured attributes
-- These enable more precise matching of user queries like "outdoor seating for 6 people"

-- Cuisine types for restaurants (e.g., ['Japanese', 'Italian', 'Mediterranean'])
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cuisines TEXT[] DEFAULT '{}';

-- Dining style (e.g., ['casual', 'fine-dining', 'fast-casual'])
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS dining_style TEXT[] DEFAULT '{}';

-- Meal types served (e.g., ['breakfast', 'lunch', 'dinner', 'brunch'])
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS meal_types TEXT[] DEFAULT '{}';

-- Dietary options available (e.g., ['vegetarian', 'vegan', 'gluten-free', 'halal', 'kosher'])
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS dietary_options TEXT[] DEFAULT '{}';

-- Seating types available (e.g., ['indoor', 'outdoor', 'rooftop', 'garden', 'terrace', 'bar'])
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS seating_types TEXT[] DEFAULT '{}';

-- Amenities and features (e.g., ['wifi', 'parking', 'wheelchair-accessible', 'private-room'])
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';

-- Vibe/atmosphere tags for matching (e.g., ['romantic', 'trendy', 'hidden-gem', 'upscale'])
-- Note: vibe_tags may already exist, so we use ADD COLUMN IF NOT EXISTS
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS vibe_tags TEXT[] DEFAULT '{}';

-- Group size capacity
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS min_group_size INTEGER DEFAULT 1;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS max_group_size INTEGER;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS has_private_dining BOOLEAN DEFAULT false;

-- Reservation requirements
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS accepts_reservations BOOLEAN DEFAULT true;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS reservation_required BOOLEAN DEFAULT false;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS walk_ins_allowed BOOLEAN DEFAULT true;

-- Kid/family friendly
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS kid_friendly BOOLEAN;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN;

-- Business/occasion suitability
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS suitable_for_business BOOLEAN;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS suitable_for_date BOOLEAN;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS suitable_for_groups BOOLEAN;

-- ============================================================================
-- CREATE INDEXES FOR EFFICIENT FILTERING
-- ============================================================================

-- GIN indexes for array columns to enable efficient contains queries
CREATE INDEX IF NOT EXISTS idx_destinations_cuisines ON destinations USING GIN(cuisines);
CREATE INDEX IF NOT EXISTS idx_destinations_dietary_options ON destinations USING GIN(dietary_options);
CREATE INDEX IF NOT EXISTS idx_destinations_seating_types ON destinations USING GIN(seating_types);
CREATE INDEX IF NOT EXISTS idx_destinations_amenities ON destinations USING GIN(amenities);
CREATE INDEX IF NOT EXISTS idx_destinations_vibe_tags ON destinations USING GIN(vibe_tags);
CREATE INDEX IF NOT EXISTS idx_destinations_meal_types ON destinations USING GIN(meal_types);
CREATE INDEX IF NOT EXISTS idx_destinations_dining_style ON destinations USING GIN(dining_style);

-- B-tree indexes for scalar columns
CREATE INDEX IF NOT EXISTS idx_destinations_max_group_size ON destinations(max_group_size);
CREATE INDEX IF NOT EXISTS idx_destinations_kid_friendly ON destinations(kid_friendly) WHERE kid_friendly = true;
CREATE INDEX IF NOT EXISTS idx_destinations_pet_friendly ON destinations(pet_friendly) WHERE pet_friendly = true;
CREATE INDEX IF NOT EXISTS idx_destinations_has_private_dining ON destinations(has_private_dining) WHERE has_private_dining = true;

-- ============================================================================
-- HELPER FUNCTION: SEARCH WITH ENHANCED FILTERS
-- ============================================================================

CREATE OR REPLACE FUNCTION search_destinations_enhanced(
  p_query TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_cuisines TEXT[] DEFAULT NULL,
  p_dietary TEXT[] DEFAULT NULL,
  p_seating TEXT[] DEFAULT NULL,
  p_amenities TEXT[] DEFAULT NULL,
  p_vibes TEXT[] DEFAULT NULL,
  p_min_group_size INTEGER DEFAULT NULL,
  p_kid_friendly BOOLEAN DEFAULT NULL,
  p_price_max INTEGER DEFAULT NULL,
  p_michelin_only BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  name TEXT,
  city TEXT,
  country TEXT,
  neighborhood TEXT,
  category TEXT,
  micro_description TEXT,
  description TEXT,
  image TEXT,
  rating NUMERIC,
  price_level INTEGER,
  michelin_stars INTEGER,
  cuisines TEXT[],
  dietary_options TEXT[],
  seating_types TEXT[],
  amenities TEXT[],
  vibe_tags TEXT[],
  max_group_size INTEGER,
  kid_friendly BOOLEAN,
  match_score NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.slug,
    d.name,
    d.city,
    d.country,
    d.neighborhood,
    d.category,
    d.micro_description,
    d.description,
    d.image,
    d.rating,
    d.price_level,
    d.michelin_stars,
    d.cuisines,
    d.dietary_options,
    d.seating_types,
    d.amenities,
    d.vibe_tags,
    d.max_group_size,
    d.kid_friendly,
    -- Calculate match score based on filter matches
    (
      CASE WHEN p_cuisines IS NOT NULL AND d.cuisines && p_cuisines THEN 1.0 ELSE 0.0 END +
      CASE WHEN p_dietary IS NOT NULL AND d.dietary_options && p_dietary THEN 1.0 ELSE 0.0 END +
      CASE WHEN p_seating IS NOT NULL AND d.seating_types && p_seating THEN 1.0 ELSE 0.0 END +
      CASE WHEN p_amenities IS NOT NULL AND d.amenities && p_amenities THEN 1.0 ELSE 0.0 END +
      CASE WHEN p_vibes IS NOT NULL AND d.vibe_tags && p_vibes THEN 1.0 ELSE 0.0 END +
      CASE WHEN p_min_group_size IS NOT NULL AND d.max_group_size >= p_min_group_size THEN 1.0 ELSE 0.0 END +
      COALESCE(d.rating::NUMERIC / 5.0, 0.0)
    ) AS match_score
  FROM destinations d
  WHERE
    -- City filter (case-insensitive)
    (p_city IS NULL OR d.city ILIKE '%' || p_city || '%')
    -- Category filter (case-insensitive)
    AND (p_category IS NULL OR d.category ILIKE '%' || p_category || '%')
    -- Cuisine filter (any overlap)
    AND (p_cuisines IS NULL OR d.cuisines && p_cuisines)
    -- Dietary filter (any overlap)
    AND (p_dietary IS NULL OR d.dietary_options && p_dietary)
    -- Seating filter (any overlap)
    AND (p_seating IS NULL OR d.seating_types && p_seating)
    -- Amenities filter (any overlap)
    AND (p_amenities IS NULL OR d.amenities && p_amenities)
    -- Vibes filter (any overlap)
    AND (p_vibes IS NULL OR d.vibe_tags && p_vibes)
    -- Group size filter
    AND (p_min_group_size IS NULL OR d.max_group_size >= p_min_group_size)
    -- Kid-friendly filter
    AND (p_kid_friendly IS NULL OR d.kid_friendly = p_kid_friendly)
    -- Price filter
    AND (p_price_max IS NULL OR d.price_level <= p_price_max)
    -- Michelin filter
    AND (NOT p_michelin_only OR d.michelin_stars > 0)
  ORDER BY match_score DESC, d.rating DESC NULLS LAST
  LIMIT p_limit;
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: GET UNMATCHED FILTERS
-- Returns which filters from the query could not be matched in the results
-- ============================================================================

CREATE OR REPLACE FUNCTION get_unmatched_filters(
  p_city TEXT DEFAULT NULL,
  p_cuisines TEXT[] DEFAULT NULL,
  p_dietary TEXT[] DEFAULT NULL,
  p_seating TEXT[] DEFAULT NULL,
  p_amenities TEXT[] DEFAULT NULL,
  p_vibes TEXT[] DEFAULT NULL,
  p_min_group_size INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  unmatched JSONB := '[]'::JSONB;
  cuisine_exists BOOLEAN;
  dietary_exists BOOLEAN;
  seating_exists BOOLEAN;
  amenity_exists BOOLEAN;
  vibe_exists BOOLEAN;
  group_size_exists BOOLEAN;
BEGIN
  -- Check if any destinations in the city have the requested cuisines
  IF p_city IS NOT NULL AND p_cuisines IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM destinations
      WHERE city ILIKE '%' || p_city || '%' AND cuisines && p_cuisines
    ) INTO cuisine_exists;
    IF NOT cuisine_exists THEN
      unmatched := unmatched || to_jsonb(ARRAY['cuisines: ' || array_to_string(p_cuisines, ', ')]);
    END IF;
  END IF;

  -- Check dietary options
  IF p_city IS NOT NULL AND p_dietary IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM destinations
      WHERE city ILIKE '%' || p_city || '%' AND dietary_options && p_dietary
    ) INTO dietary_exists;
    IF NOT dietary_exists THEN
      unmatched := unmatched || to_jsonb(ARRAY['dietary: ' || array_to_string(p_dietary, ', ')]);
    END IF;
  END IF;

  -- Check seating types
  IF p_city IS NOT NULL AND p_seating IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM destinations
      WHERE city ILIKE '%' || p_city || '%' AND seating_types && p_seating
    ) INTO seating_exists;
    IF NOT seating_exists THEN
      unmatched := unmatched || to_jsonb(ARRAY['seating: ' || array_to_string(p_seating, ', ')]);
    END IF;
  END IF;

  -- Check amenities
  IF p_city IS NOT NULL AND p_amenities IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM destinations
      WHERE city ILIKE '%' || p_city || '%' AND amenities && p_amenities
    ) INTO amenity_exists;
    IF NOT amenity_exists THEN
      unmatched := unmatched || to_jsonb(ARRAY['amenities: ' || array_to_string(p_amenities, ', ')]);
    END IF;
  END IF;

  -- Check vibes
  IF p_city IS NOT NULL AND p_vibes IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM destinations
      WHERE city ILIKE '%' || p_city || '%' AND vibe_tags && p_vibes
    ) INTO vibe_exists;
    IF NOT vibe_exists THEN
      unmatched := unmatched || to_jsonb(ARRAY['vibes: ' || array_to_string(p_vibes, ', ')]);
    END IF;
  END IF;

  -- Check group size
  IF p_city IS NOT NULL AND p_min_group_size IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM destinations
      WHERE city ILIKE '%' || p_city || '%' AND max_group_size >= p_min_group_size
    ) INTO group_size_exists;
    IF NOT group_size_exists THEN
      unmatched := unmatched || to_jsonb(ARRAY['group size: ' || p_min_group_size::TEXT || '+ people']);
    END IF;
  END IF;

  RETURN unmatched;
END;
$$;

COMMIT;
