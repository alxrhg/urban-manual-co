-- Migration: Add nested destinations support
-- Allows destinations to be nested within other destinations (e.g., a bar in a hotel)
-- Date: 2025-01-XX

BEGIN;

-- Add parent_destination_id column to destinations table
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS parent_destination_id INTEGER REFERENCES destinations(id) ON DELETE SET NULL;

-- Add index for performance when querying nested destinations
CREATE INDEX IF NOT EXISTS idx_destinations_parent_id 
  ON destinations(parent_destination_id) 
  WHERE parent_destination_id IS NOT NULL;

-- Add check constraint to prevent circular references
-- A destination cannot be its own parent, and we'll handle deeper cycles in application logic
ALTER TABLE destinations
  DROP CONSTRAINT IF EXISTS chk_no_self_parent;

ALTER TABLE destinations
  ADD CONSTRAINT chk_no_self_parent
  CHECK (parent_destination_id IS NULL OR parent_destination_id != id);

-- Create function to get nested destinations for a parent
CREATE OR REPLACE FUNCTION get_nested_destinations(parent_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  description TEXT,
  content TEXT,
  image TEXT,
  michelin_stars INTEGER,
  crown BOOLEAN,
  rating DECIMAL,
  price_level INTEGER,
  latitude DECIMAL,
  longitude DECIMAL,
  place_id TEXT,
  website TEXT,
  phone_number TEXT,
  opening_hours JSONB,
  tags TEXT[],
  parent_destination_id INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.slug,
    d.name,
    d.city,
    d.category,
    d.description,
    d.content,
    d.image,
    d.michelin_stars,
    d.crown,
    d.rating,
    d.price_level,
    d.latitude,
    d.longitude,
    d.place_id,
    d.website,
    d.phone_number,
    d.opening_hours,
    d.tags,
    d.parent_destination_id
  FROM destinations d
  WHERE d.parent_destination_id = parent_id
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get all nested destinations recursively (for deep nesting)
CREATE OR REPLACE FUNCTION get_all_nested_destinations(parent_id INTEGER)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  description TEXT,
  content TEXT,
  image TEXT,
  michelin_stars INTEGER,
  crown BOOLEAN,
  rating DECIMAL,
  price_level INTEGER,
  latitude DECIMAL,
  longitude DECIMAL,
  place_id TEXT,
  website TEXT,
  phone_number TEXT,
  opening_hours JSONB,
  tags TEXT[],
  parent_destination_id INTEGER,
  nesting_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE nested AS (
    -- Base case: direct children
    SELECT 
      d.id,
      d.slug,
      d.name,
      d.city,
      d.category,
      d.description,
      d.content,
      d.image,
      d.michelin_stars,
      d.crown,
      d.rating,
      d.price_level,
      d.latitude,
      d.longitude,
      d.place_id,
      d.website,
      d.phone_number,
      d.opening_hours,
      d.tags,
      d.parent_destination_id,
      1 AS nesting_level
    FROM destinations d
    WHERE d.parent_destination_id = parent_id
    
    UNION ALL
    
    -- Recursive case: children of nested destinations
    SELECT 
      d.id,
      d.slug,
      d.name,
      d.city,
      d.category,
      d.description,
      d.content,
      d.image,
      d.michelin_stars,
      d.crown,
      d.rating,
      d.price_level,
      d.latitude,
      d.longitude,
      d.place_id,
      d.website,
      d.phone_number,
      d.opening_hours,
      d.tags,
      d.parent_destination_id,
      n.nesting_level + 1
    FROM destinations d
    INNER JOIN nested n ON d.parent_destination_id = n.id
    WHERE n.nesting_level < 10  -- Prevent infinite recursion (max 10 levels)
  )
  SELECT * FROM nested
  ORDER BY nesting_level, name;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment for documentation
COMMENT ON COLUMN destinations.parent_destination_id IS 'References the parent destination if this destination is nested (e.g., a bar within a hotel). NULL for top-level destinations.';
COMMENT ON FUNCTION get_nested_destinations IS 'Returns direct children of a parent destination';
COMMENT ON FUNCTION get_all_nested_destinations IS 'Returns all nested destinations recursively (up to 10 levels deep)';

-- Update RLS policies if needed (nested destinations should follow same access rules as parent)
-- Note: RLS policies on destinations table should already handle this, but we ensure nested items are accessible

COMMIT;

