-- Migration 437: Ensure embedding column uses vector(3072)
-- This migration ensures the destinations.embedding column matches text-embedding-3-large output
-- If the column exists with wrong dimensions, it will be recreated (data will need to be regenerated)

BEGIN;

-- Check and fix embedding column dimension
DO $$
DECLARE
  current_type TEXT;
BEGIN
  -- Get current column type
  SELECT pg_catalog.format_type(att.atttypid, att.atttypmod)
  INTO current_type
  FROM pg_attribute att
  WHERE att.attrelid = 'public.destinations'::regclass
    AND att.attname = 'embedding'
    AND NOT att.attisdropped;

  -- Only modify if not already vector(3072)
  IF current_type IS DISTINCT FROM 'vector(3072)' THEN
    RAISE NOTICE 'Embedding column is %, converting to vector(3072)', current_type;

    IF current_type IS NOT NULL THEN
      -- Drop existing column (embeddings will need to be regenerated)
      ALTER TABLE destinations DROP COLUMN IF EXISTS embedding CASCADE;
    END IF;

    -- Add column with correct dimension
    ALTER TABLE destinations ADD COLUMN embedding vector(3072);

    RAISE NOTICE 'Embedding column recreated. Run backfill-embeddings script to regenerate.';
  ELSE
    RAISE NOTICE 'Embedding column already vector(3072), no changes needed';
  END IF;
END $$;

-- Recreate HNSW index for better performance (if not exists)
DROP INDEX IF EXISTS idx_destinations_embedding_hnsw;
DROP INDEX IF EXISTS idx_destinations_embedding;

CREATE INDEX IF NOT EXISTS idx_destinations_embedding_hnsw
  ON destinations USING hnsw (embedding vector_cosine_ops)
  WITH (m = 32, ef_construction = 128)
  WHERE embedding IS NOT NULL;

-- Also ensure search_text column exists for hybrid search
ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS search_text TEXT;

-- Ensure search_text is populated
UPDATE destinations
SET search_text = CONCAT_WS(' ',
  name,
  description,
  content,
  city,
  category,
  country,
  COALESCE(ARRAY_TO_STRING(vibe_tags, ' '), ''),
  COALESCE(ARRAY_TO_STRING(keywords, ' '), ''),
  COALESCE(ARRAY_TO_STRING(search_keywords, ' '), ''),
  COALESCE(short_summary, ''),
  COALESCE(editorial_summary, '')
)
WHERE search_text IS NULL OR search_text = '';

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_destinations_search_text_gin
  ON destinations USING GIN (to_tsvector('english', COALESCE(search_text, '')));

COMMIT;
