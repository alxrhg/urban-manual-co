-- Migration: Add awards field to architects table
-- Purpose: Store architectural awards and prizes (e.g., Pritzker Prize)
-- Date: 2025-11-27

-- Add awards column to architects table as JSONB
ALTER TABLE architects
ADD COLUMN IF NOT EXISTS awards JSONB DEFAULT NULL;

-- Create index on awards for potential filtering
CREATE INDEX IF NOT EXISTS idx_architects_awards ON architects USING GIN (awards);

-- Add comment to explain the structure
COMMENT ON COLUMN architects.awards IS 'JSON array of awards/prizes, e.g., [{"name": "Pritzker Prize", "year": 2022}]';
