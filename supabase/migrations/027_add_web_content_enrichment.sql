-- Migration: Add Exa Web Enrichment Fields
-- Adds specific columns for different types of web-enriched information from Exa
-- Note: Uses existing fields where possible (architect, architectural_style, designer_name)
-- Date: 2025-01-XX

DO $$ BEGIN
  -- New Design Fields (don't exist yet)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS design_firm text; -- Design firm/studio name
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS design_period text; -- e.g., "1960s", "Contemporary"
  
  -- Full architect/design info with sources (new JSON field)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS architect_info_json jsonb; -- Full details about architect/design with sources
  
  -- General Web Content (for other types of information)
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS web_content_json jsonb; -- General web search results
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS web_content_updated_at timestamptz;
  ALTER TABLE destinations ADD COLUMN IF NOT EXISTS architect_info_updated_at timestamptz;
  
  -- Note: Using existing fields:
  -- - architect (already exists, column 69)
  -- - architectural_style (already exists, column 26)
  -- - designer_name (already exists, column 27) - will map to interior_designer from Exa
  
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- Create indexes for new design fields
CREATE INDEX IF NOT EXISTS idx_destinations_design_firm ON destinations(design_firm) WHERE design_firm IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_design_period ON destinations(design_period) WHERE design_period IS NOT NULL;
-- Note: architect, architectural_style, and designer_name indexes may already exist

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_destinations_architect_info_json ON destinations USING GIN(architect_info_json) WHERE architect_info_json IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_web_content ON destinations USING GIN(web_content_json) WHERE web_content_json IS NOT NULL;

-- Create indexes for update tracking
CREATE INDEX IF NOT EXISTS idx_destinations_architect_info_updated ON destinations(architect_info_updated_at DESC) WHERE architect_info_updated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_web_content_updated ON destinations(web_content_updated_at DESC) WHERE web_content_updated_at IS NOT NULL;

