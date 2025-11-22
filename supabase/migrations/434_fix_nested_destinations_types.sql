-- Fix nested destinations RPC functions to handle type mismatches
-- Converts numeric rating to double precision for consistency

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_nested_destinations(integer);
DROP FUNCTION IF EXISTS get_all_nested_destinations(integer);

-- Create function to get direct nested destinations
CREATE OR REPLACE FUNCTION get_nested_destinations(parent_id integer)
RETURNS TABLE (
  id integer,
  slug text,
  name text,
  city text,
  country text,
  category text,
  description text,
  content text,
  image text,
  image_thumbnail text,
  michelin_stars integer,
  crown boolean,
  rating double precision,
  price_level integer,
  latitude double precision,
  longitude double precision,
  parent_destination_id integer,
  architect_id uuid,
  design_firm_id uuid,
  interior_designer_id uuid,
  movement_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.slug,
    d.name,
    d.city,
    d.country,
    d.description,
    d.content,
    d.image,
    d.image_thumbnail,
    d.michelin_stars,
    d.crown,
    COALESCE(d.rating::double precision, NULL::double precision) as rating,
    d.price_level,
    d.latitude,
    d.longitude,
    d.parent_destination_id,
    d.architect_id,
    d.design_firm_id,
    d.interior_designer_id,
    d.movement_id,
    d.created_at,
    d.updated_at
  FROM destinations d
  WHERE d.parent_destination_id = get_nested_destinations.parent_id
  ORDER BY d.name;
END;
$$;

-- Create recursive function to get all nested destinations (deep)
CREATE OR REPLACE FUNCTION get_all_nested_destinations(parent_id integer)
RETURNS TABLE (
  id integer,
  slug text,
  name text,
  city text,
  country text,
  category text,
  description text,
  content text,
  image text,
  image_thumbnail text,
  michelin_stars integer,
  crown boolean,
  rating double precision,
  price_level integer,
  latitude double precision,
  longitude double precision,
  parent_destination_id integer,
  architect_id uuid,
  design_firm_id uuid,
  interior_designer_id uuid,
  movement_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE nested AS (
    -- Base case: direct children
    SELECT 
      d.id,
      d.slug,
      d.name,
      d.city,
      d.country,
      d.description,
      d.content,
      d.image,
      d.image_thumbnail,
      d.michelin_stars,
      d.crown,
      COALESCE(d.rating::double precision, NULL::double precision) as rating,
      d.price_level,
      d.latitude,
      d.longitude,
      d.parent_destination_id,
      d.architect_id,
      d.design_firm_id,
      d.interior_designer_id,
      d.movement_id,
      d.created_at,
      d.updated_at
    FROM destinations d
    WHERE d.parent_destination_id = get_all_nested_destinations.parent_id
    
    UNION ALL
    
    -- Recursive case: children of children
    SELECT 
      d.id,
      d.slug,
      d.name,
      d.city,
      d.country,
      d.description,
      d.content,
      d.image,
      d.image_thumbnail,
      d.michelin_stars,
      d.crown,
      COALESCE(d.rating::double precision, NULL::double precision) as rating,
      d.price_level,
      d.latitude,
      d.longitude,
      d.parent_destination_id,
      d.architect_id,
      d.design_firm_id,
      d.interior_designer_id,
      d.movement_id,
      d.created_at,
      d.updated_at
    FROM destinations d
    INNER JOIN nested n ON d.parent_destination_id = n.id
  )
  SELECT * FROM nested
  ORDER BY name;
END;
$$;

-- Add comments
COMMENT ON FUNCTION get_nested_destinations(integer) IS 'Get direct nested destinations for a parent destination. Returns rating as double precision.';
COMMENT ON FUNCTION get_all_nested_destinations(integer) IS 'Get all nested destinations recursively (deep). Returns rating as double precision.';

