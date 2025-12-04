-- Migration 436: Fix match_destinations RPC function
-- * Ensures match_destinations exists with vector(3072) to match text-embedding-3-large
-- * Adds filter_brand parameter for brand filtering
-- * Includes search_text ranking boost for hybrid search

BEGIN;

-- Drop any existing versions with different signatures
DROP FUNCTION IF EXISTS match_destinations(vector(1536), float, int, text, text, int, numeric, int, text);
DROP FUNCTION IF EXISTS match_destinations(vector(3072), float, int, text, text, int, numeric, int, text);
DROP FUNCTION IF EXISTS match_destinations(vector(3072), float, int, text, text, int, numeric, int, text, text);
DROP FUNCTION IF EXISTS match_destinations(vector, float, int, text, text, int, numeric, int, text, text);

-- Create match_destinations with vector(3072) and all filters including brand
CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(3072),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 50,
  filter_city text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_michelin_stars int DEFAULT NULL,
  filter_min_rating numeric DEFAULT NULL,
  filter_max_price_level int DEFAULT NULL,
  search_query text DEFAULT NULL,
  filter_brand text DEFAULT NULL
)
RETURNS TABLE (
  id int,
  slug text,
  name text,
  city text,
  category text,
  description text,
  content text,
  image text,
  michelin_stars int,
  crown boolean,
  rating numeric,
  price_level int,
  ai_vibe_tags text[],
  ai_keywords text[],
  ai_short_summary text,
  tags text[],
  architect text,
  brand text,
  neighborhood text,
  country text,
  similarity float,
  rank float
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
    d.category,
    d.description,
    d.content,
    d.image,
    d.michelin_stars,
    d.crown,
    d.rating,
    d.price_level,
    d.ai_vibe_tags,
    d.ai_keywords,
    d.ai_short_summary,
    d.tags,
    d.architect,
    d.brand,
    d.neighborhood,
    d.country,
    (1 - (d.embedding <=> query_embedding))::float as similarity,
    -- Hybrid ranking: combine vector similarity with text search relevance
    CASE
      WHEN search_query IS NOT NULL AND d.search_text IS NOT NULL THEN
        (1 - (d.embedding <=> query_embedding)) * 0.7 +
        ts_rank(to_tsvector('english', d.search_text), plainto_tsquery('english', search_query)) * 0.3
      ELSE
        (1 - (d.embedding <=> query_embedding))
    END::float as rank
  FROM destinations d
  WHERE
    d.embedding IS NOT NULL
    -- Similarity threshold (lowered for better recall)
    AND (1 - (d.embedding <=> query_embedding)) >= match_threshold
    -- Optional filters
    AND (filter_city IS NULL OR d.city ILIKE '%' || filter_city || '%')
    AND (filter_category IS NULL OR d.category ILIKE '%' || filter_category || '%')
    AND (filter_michelin_stars IS NULL OR d.michelin_stars >= filter_michelin_stars)
    AND (filter_min_rating IS NULL OR d.rating >= filter_min_rating)
    AND (filter_max_price_level IS NULL OR d.price_level <= filter_max_price_level)
    AND (filter_brand IS NULL OR d.brand ILIKE '%' || filter_brand || '%')
    -- Exclude child destinations (nested) from main search
    AND d.parent_destination_id IS NULL
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- Also create a simpler version without filter_brand for backward compatibility
-- This allows callers who don't pass filter_brand to still work
CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  filter_city text,
  filter_category text,
  filter_michelin_stars int,
  filter_min_rating numeric,
  filter_max_price_level int,
  search_query text
)
RETURNS TABLE (
  id int,
  slug text,
  name text,
  city text,
  category text,
  description text,
  content text,
  image text,
  michelin_stars int,
  crown boolean,
  rating numeric,
  price_level int,
  ai_vibe_tags text[],
  ai_keywords text[],
  ai_short_summary text,
  tags text[],
  architect text,
  brand text,
  neighborhood text,
  country text,
  similarity float,
  rank float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delegate to the full function with NULL filter_brand
  RETURN QUERY
  SELECT * FROM match_destinations(
    query_embedding,
    match_threshold,
    match_count,
    filter_city,
    filter_category,
    filter_michelin_stars,
    filter_min_rating,
    filter_max_price_level,
    search_query,
    NULL::text  -- filter_brand
  );
END;
$$;

-- Add helpful comments
COMMENT ON FUNCTION match_destinations(vector(3072), float, int, text, text, int, numeric, int, text, text) IS
  'Semantic search for destinations using vector similarity with optional filters. Uses text-embedding-3-large (3072 dimensions).';

COMMIT;
