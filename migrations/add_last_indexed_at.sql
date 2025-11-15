-- Migration: Add last_indexed_at column to destinations table
-- This tracks when each destination was last indexed in Upstash Vector
-- Enables incremental reindexing (only process changed destinations)

-- Add last_indexed_at column if it doesn't exist
ALTER TABLE destinations 
ADD COLUMN IF NOT EXISTS last_indexed_at TIMESTAMPTZ;

-- Add index for efficient querying of changed destinations
CREATE INDEX IF NOT EXISTS idx_destinations_last_indexed_at 
ON destinations(last_indexed_at);

-- Add index for incremental reindex queries (updated_at > last_indexed_at)
CREATE INDEX IF NOT EXISTS idx_destinations_updated_indexed 
ON destinations(updated_at, last_indexed_at);

-- Comment for documentation
COMMENT ON COLUMN destinations.last_indexed_at IS 
'Timestamp when this destination was last indexed in Upstash Vector. Used for incremental reindexing.';
