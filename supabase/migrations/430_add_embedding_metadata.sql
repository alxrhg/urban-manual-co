-- Migration: add embedding metadata for version tracking
BEGIN;

ALTER TABLE destinations
  ADD COLUMN IF NOT EXISTS embedding_metadata JSONB;

COMMIT;
