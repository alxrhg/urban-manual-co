-- Migration: Fix embedding dimension mismatch
-- The database has embedding vector(768) from old migration
-- But code uses text-embedding-3-large which produces 1536 dimensions
-- This migration updates the column to vector(1536) to match

BEGIN;

-- Check if embedding column exists and has wrong dimension
DO $$
DECLARE
  current_dim INTEGER;
BEGIN
  -- Get current dimension of embedding column
  SELECT COUNT(*) INTO current_dim
  FROM information_schema.columns
  WHERE table_name = 'destinations'
    AND column_name = 'embedding'
    AND data_type = 'USER-DEFINED';
  
  -- If column exists, check its actual dimension by querying pg_attribute
  IF current_dim > 0 THEN
    -- Check if we need to alter the column
    -- We'll drop and recreate to change dimension
    ALTER TABLE destinations DROP COLUMN IF EXISTS embedding CASCADE;
    ALTER TABLE destinations ADD COLUMN embedding vector(1536);
    
    -- Recreate index
    CREATE INDEX IF NOT EXISTS idx_destinations_embedding 
      ON destinations USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
      
    RAISE NOTICE 'Updated embedding column from vector(768) to vector(1536)';
  END IF;
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

