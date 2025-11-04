-- Migration: Fix embedding dimension mismatch
-- The database has embedding vector(768) from old migration
-- But code uses text-embedding-3-large which produces 1536 dimensions
-- This migration updates the column to vector(1536) to match

BEGIN;

-- Drop and recreate embedding column with correct dimension
-- This handles both vector(768) and any other mismatched dimensions
DO $$
BEGIN
  -- Drop the column if it exists (CASCADE will drop dependent indexes/constraints)
  ALTER TABLE destinations DROP COLUMN IF EXISTS embedding CASCADE;
  
  -- Add column with correct dimension for text-embedding-3-large (1536)
  ALTER TABLE destinations ADD COLUMN embedding vector(1536);
  
  -- Recreate index
  CREATE INDEX IF NOT EXISTS idx_destinations_embedding 
    ON destinations USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100)
    WHERE embedding IS NOT NULL;
    
  RAISE NOTICE 'Updated embedding column to vector(1536)';
END $$;

-- Also update search_destinations_intelligent function to match
CREATE OR REPLACE FUNCTION search_destinations_intelligent(
  query_embedding vector(1536),
  user_id_param UUID DEFAULT NULL,
  city_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  open_now_filter BOOLEAN DEFAULT false,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  content TEXT,
  image_url TEXT,
  rating NUMERIC,
  price_level INTEGER,
  michelin_stars INTEGER,
  is_open_now BOOLEAN,
  similarity_score FLOAT,
  rank_score FLOAT,
  trending_score FLOAT,
  is_saved BOOLEAN,
  final_score FLOAT
)
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
    COALESCE(d.content, d.description) as content,
    COALESCE(d.image, d.main_image) as image_url,
    d.rating,
    d.price_level,
    d.michelin_stars,
    d.is_open_now,
    1 - (d.embedding <=> query_embedding) as similarity_score,
    d.rank_score,
    d.trending_score,
    EXISTS(
      SELECT 1 FROM saved_places sp 
      WHERE sp.destination_slug = d.slug 
        AND sp.user_id = user_id_param
    ) as is_saved,
    -- Blended scoring: semantic (70%) + editorial rank (20%) + trending (10%)
    (1 - (d.embedding <=> query_embedding)) * 0.70 +
    COALESCE(d.rank_score, 0.5) * 0.20 +
    COALESCE(d.trending_score / 10, 0) * 0.10 as final_score
  FROM destinations d
  WHERE 
    d.embedding IS NOT NULL
    AND (city_filter IS NULL OR d.city ILIKE '%' || city_filter || '%')
    AND (category_filter IS NULL OR d.category = category_filter)
    AND (NOT open_now_filter OR d.is_open_now = true)
  ORDER BY final_score DESC
  LIMIT limit_count;
END;

$$ LANGUAGE plpgsql;

COMMIT;

-- Also update search_destinations_intelligent function to match
CREATE OR REPLACE FUNCTION search_destinations_intelligent(
  query_embedding vector(1536),
  user_id_param UUID DEFAULT NULL,
  city_filter TEXT DEFAULT NULL,
  category_filter TEXT DEFAULT NULL,
  open_now_filter BOOLEAN DEFAULT false,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  slug TEXT,
  name TEXT,
  city TEXT,
  category TEXT,
  content TEXT,
  image_url TEXT,
  rating NUMERIC,
  price_level INTEGER,
  michelin_stars INTEGER,
  is_open_now BOOLEAN,
  similarity_score FLOAT,
  rank_score FLOAT,
  trending_score FLOAT,
  is_saved BOOLEAN,
  final_score FLOAT
)
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
    COALESCE(d.content, d.description) as content,
    COALESCE(d.image, d.main_image) as image_url,
    d.rating,
    d.price_level,
    d.michelin_stars,
    d.is_open_now,
    1 - (d.embedding <=> query_embedding) as similarity_score,
    d.rank_score,
    d.trending_score,
    EXISTS(
      SELECT 1 FROM saved_places sp 
      WHERE sp.destination_slug = d.slug 
        AND sp.user_id = user_id_param
    ) as is_saved,
    -- Blended scoring: semantic (70%) + editorial rank (20%) + trending (10%)
    (1 - (d.embedding <=> query_embedding)) * 0.70 +
    COALESCE(d.rank_score, 0.5) * 0.20 +
    COALESCE(d.trending_score / 10, 0) * 0.10 as final_score
  FROM destinations d
  WHERE 
    d.embedding IS NOT NULL
    AND (city_filter IS NULL OR d.city ILIKE '%' || city_filter || '%')
    AND (category_filter IS NULL OR d.category = category_filter)
    AND (NOT open_now_filter OR d.is_open_now = true)
  ORDER BY final_score DESC
  LIMIT limit_count;
END;

$$ LANGUAGE plpgsql;

COMMIT;

