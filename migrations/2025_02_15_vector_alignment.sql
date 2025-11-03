-- Align vector search schema with 1536-dimension embeddings and modern ranking
-- Drops legacy 768-dimension helpers and rebuilds match_destinations to read
-- from destinations.vector_embedding while blending editorial scores.

-- Drop legacy functions that referenced the old embedding column
DROP FUNCTION IF EXISTS match_destinations(vector(768), float, int);
DROP FUNCTION IF EXISTS match_destinations(vector(768), float, int, text, text, int, numeric, int, text);
DROP FUNCTION IF EXISTS match_destinations(vector(768), float, int, text, text, int, numeric, int, text, text);
DROP FUNCTION IF EXISTS match_destinations(vector(1536), float, int);
DROP FUNCTION IF EXISTS match_destinations(vector(1536), float, int, text, text, int, numeric, int, text);
DROP FUNCTION IF EXISTS match_destinations(vector(1536), float, int, text, text, int, numeric, int, text, text);

-- Ensure the new vector column exists
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS vector_embedding vector(1536);

-- Drop the legacy embedding column once the new column is present
ALTER TABLE destinations
  DROP COLUMN IF EXISTS embedding;

-- Rebuild indexes for the 1536-dimension vector column
CREATE INDEX IF NOT EXISTS idx_destinations_vector_embedding_hnsw
  ON destinations USING hnsw (vector_embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Helper to build a tsquery safely (returns NULL for empty queries)
CREATE OR REPLACE FUNCTION to_safe_tsquery(q text)
RETURNS tsquery AS $$
BEGIN
  IF q IS NULL OR length(trim(q)) = 0 THEN
    RETURN NULL;
  END IF;
  RETURN websearch_to_tsquery('english', q);
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recreate match_destinations with vector_embedding and blended ranking
CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.55,
  match_count int DEFAULT 50,
  filter_city text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_michelin_stars int DEFAULT NULL,
  filter_min_rating numeric DEFAULT NULL,
  filter_max_price_level int DEFAULT NULL,
  filter_cuisine text DEFAULT NULL,
  search_query text DEFAULT NULL
)
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
  michelin_stars int,
  crown boolean,
  rating numeric,
  price_level int,
  tags text[],
  rank_score numeric,
  trending_score numeric,
  vector_similarity float,
  full_text_rank float,
  blended_rank float
)
LANGUAGE plpgsql
AS $$
DECLARE
  ts_query tsquery := to_safe_tsquery(search_query);
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      d.id,
      d.slug,
      d.name,
      d.city,
      d.country,
      d.category,
      d.description,
      d.content,
      d.image,
      d.michelin_stars,
      d.crown,
      d.rating,
      d.price_level,
      d.tags,
      d.rank_score,
      d.trending_score,
      (1 - (d.vector_embedding <=> query_embedding))::float AS vector_similarity,
      CASE
        WHEN ts_query IS NULL OR d.search_text IS NULL THEN 0
        ELSE ts_rank(to_tsvector('english', d.search_text), ts_query)
      END AS full_text_rank
    FROM destinations d
    WHERE d.vector_embedding IS NOT NULL
      AND (1 - (d.vector_embedding <=> query_embedding)) >= match_threshold
      AND (filter_city IS NULL OR d.city ILIKE '%' || filter_city || '%')
      AND (filter_category IS NULL OR d.category ILIKE '%' || filter_category || '%')
      AND (filter_michelin_stars IS NULL OR d.michelin_stars >= filter_michelin_stars)
      AND (filter_min_rating IS NULL OR d.rating >= filter_min_rating)
      AND (filter_max_price_level IS NULL OR d.price_level <= filter_max_price_level)
      AND (
        filter_cuisine IS NULL OR
        (d.tags IS NOT NULL AND EXISTS (
          SELECT 1 FROM unnest(d.tags) t WHERE t ILIKE '%' || filter_cuisine || '%'
        ))
      )
  )
  SELECT
    r.*, 
    (
      coalesce(r.vector_similarity, 0) * 0.6 +
      coalesce(r.rank_score, 0) * 0.25 +
      coalesce(r.trending_score, 0) * 0.1 +
      coalesce(r.full_text_rank, 0) * 0.05
    ) AS blended_rank
  FROM ranked r
  ORDER BY blended_rank DESC
  LIMIT match_count;
END;
$$;

-- Backwards-compatible wrapper without cuisine filter to support cached RPC definitions
CREATE OR REPLACE FUNCTION match_destinations(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.55,
  match_count int DEFAULT 50,
  filter_city text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_michelin_stars int DEFAULT NULL,
  filter_min_rating numeric DEFAULT NULL,
  filter_max_price_level int DEFAULT NULL,
  search_query text DEFAULT NULL
)
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
  michelin_stars int,
  crown boolean,
  rating numeric,
  price_level int,
  tags text[],
  rank_score numeric,
  trending_score numeric,
  vector_similarity float,
  full_text_rank float,
  blended_rank float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM match_destinations(
    query_embedding,
    match_threshold,
    match_count,
    filter_city,
    filter_category,
    filter_michelin_stars,
    filter_min_rating,
    filter_max_price_level,
    NULL::text,
    search_query
  );
END;
$$;
