-- Migration: Architecture-First Schema
-- Creates architecture as primary organizing principle
-- Date: 2025-01-XX

-- ============================================================================
-- 1. ARCHITECTS TABLE - First-class entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS architects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  birth_year INT,
  death_year INT,
  nationality TEXT,
  design_philosophy TEXT,
  notable_works TEXT[],
  movements TEXT[], -- Array of movement slugs
  influences UUID[], -- Architect IDs who influenced this architect
  influenced_by UUID[], -- Architect IDs influenced by this architect
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_architects_slug ON architects(slug);
CREATE INDEX idx_architects_name ON architects(name);

-- ============================================================================
-- 2. DESIGN FIRMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS design_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  founded_year INT,
  founders UUID[], -- Architect IDs
  notable_works TEXT[],
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_design_firms_slug ON design_firms(slug);

-- ============================================================================
-- 3. DESIGN MOVEMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS design_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  period_start INT, -- Year movement started
  period_end INT, -- Year movement ended (NULL if ongoing)
  key_characteristics TEXT[],
  notable_architects UUID[], -- Architect IDs
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_design_movements_slug ON design_movements(slug);
CREATE INDEX idx_design_movements_name ON design_movements(name);

-- ============================================================================
-- 4. MATERIALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  common_uses TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_materials_slug ON materials(slug);

-- ============================================================================
-- 5. DESTINATION MATERIALS (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS destination_materials (
  destination_id INT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  PRIMARY KEY (destination_id, material_id)
);

CREATE INDEX idx_destination_materials_destination ON destination_materials(destination_id);
CREATE INDEX idx_destination_materials_material ON destination_materials(material_id);

-- ============================================================================
-- 6. ARCHITECTURAL PHOTOS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS architectural_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id INT NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  photographer TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_architectural_photos_destination ON architectural_photos(destination_id);
CREATE INDEX idx_architectural_photos_primary ON architectural_photos(destination_id, is_primary) WHERE is_primary = TRUE;

-- ============================================================================
-- 7. MODIFY DESTINATIONS TABLE - Add Architecture-First Columns
-- ============================================================================

-- Add architecture foreign keys
DO $$ 
BEGIN
  -- Architect (primary designer)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'architect_id') THEN
    ALTER TABLE destinations ADD COLUMN architect_id UUID REFERENCES architects(id);
  END IF;

  -- Design firm
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'design_firm_id') THEN
    ALTER TABLE destinations ADD COLUMN design_firm_id UUID REFERENCES design_firms(id);
  END IF;

  -- Interior designer
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'interior_designer_id') THEN
    ALTER TABLE destinations ADD COLUMN interior_designer_id UUID REFERENCES architects(id);
  END IF;

  -- Design movement
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'movement_id') THEN
    ALTER TABLE destinations ADD COLUMN movement_id UUID REFERENCES design_movements(id);
  END IF;

  -- Design period (e.g., "1960s", "Contemporary")
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'design_period') THEN
    ALTER TABLE destinations ADD COLUMN design_period TEXT;
  END IF;

  -- Architecture content (PRIMARY, not metadata)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'architectural_significance') THEN
    ALTER TABLE destinations ADD COLUMN architectural_significance TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'design_story') THEN
    ALTER TABLE destinations ADD COLUMN design_story TEXT;
  END IF;

  -- Construction and renovation
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'construction_year') THEN
    ALTER TABLE destinations ADD COLUMN construction_year INT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'renovation_history') THEN
    ALTER TABLE destinations ADD COLUMN renovation_history JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'design_awards') THEN
    ALTER TABLE destinations ADD COLUMN design_awards JSONB;
  END IF;

  -- Intelligence metadata
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'intelligence_score') THEN
    ALTER TABLE destinations ADD COLUMN intelligence_score DECIMAL(5,2) DEFAULT 0;
  END IF;

  -- Location as PostGIS POINT (if PostGIS extension available)
  -- Note: This requires PostGIS extension. If not available, keep using lat/long
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'destinations' AND column_name = 'location') THEN
    BEGIN
      -- Try to add PostGIS location column
      ALTER TABLE destinations ADD COLUMN location GEOGRAPHY(POINT, 4326);
    EXCEPTION WHEN OTHERS THEN
      -- If PostGIS not available, location column won't be added
      -- We'll use existing lat/long columns
      RAISE NOTICE 'PostGIS not available, using lat/long columns';
    END;
  END IF;
END $$;

-- Create indexes for architecture relationships
CREATE INDEX IF NOT EXISTS idx_destinations_architect ON destinations(architect_id) WHERE architect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_design_firm ON destinations(design_firm_id) WHERE design_firm_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_interior_designer ON destinations(interior_designer_id) WHERE interior_designer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_movement ON destinations(movement_id) WHERE movement_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_design_period ON destinations(design_period) WHERE design_period IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_destinations_intelligence_score ON destinations(intelligence_score DESC);

-- ============================================================================
-- 8. MIGRATE EXISTING DATA
-- ============================================================================

-- Function to create architect from text field if doesn't exist
CREATE OR REPLACE FUNCTION migrate_architect_from_text()
RETURNS void AS $$
DECLARE
  dest_record RECORD;
  arch_id UUID;
  arch_slug TEXT;
BEGIN
  -- Loop through destinations with architect text but no architect_id
  FOR dest_record IN 
    SELECT DISTINCT id, architect 
    FROM destinations 
    WHERE architect IS NOT NULL 
      AND architect != '' 
      AND architect_id IS NULL
  LOOP
    -- Create slug from architect name
    arch_slug := lower(regexp_replace(dest_record.architect, '[^a-zA-Z0-9]+', '-', 'g'));
    arch_slug := trim(both '-' from arch_slug);
    
    -- Check if architect already exists
    SELECT id INTO arch_id FROM architects WHERE slug = arch_slug;
    
    -- Create architect if doesn't exist
    IF arch_id IS NULL THEN
      INSERT INTO architects (name, slug)
      VALUES (dest_record.architect, arch_slug)
      RETURNING id INTO arch_id;
    END IF;
    
    -- Update destination with architect_id
    UPDATE destinations 
    SET architect_id = arch_id 
    WHERE id = dest_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run migration function
SELECT migrate_architect_from_text();

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to get destinations by architect
CREATE OR REPLACE FUNCTION get_destinations_by_architect(architect_slug TEXT)
RETURNS TABLE (
  id INT,
  name TEXT,
  slug TEXT,
  city TEXT,
  category TEXT,
  image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.slug,
    d.city,
    d.category,
    d.image
  FROM destinations d
  INNER JOIN architects a ON d.architect_id = a.id
  WHERE a.slug = architect_slug
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get destinations by movement
CREATE OR REPLACE FUNCTION get_destinations_by_movement(movement_slug TEXT)
RETURNS TABLE (
  id INT,
  name TEXT,
  slug TEXT,
  city TEXT,
  category TEXT,
  image TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.slug,
    d.city,
    d.category,
    d.image
  FROM destinations d
  INNER JOIN design_movements m ON d.movement_id = m.id
  WHERE m.slug = movement_slug
  ORDER BY d.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE architects IS 'First-class entities representing architects and designers. Architecture is primary, not metadata.';
COMMENT ON TABLE design_movements IS 'Design movements (Brutalism, Modernism, etc.) that organize destinations.';
COMMENT ON TABLE materials IS 'Materials used in architecture (concrete, glass, wood, etc.).';
COMMENT ON COLUMN destinations.architect_id IS 'Primary architect/designer - FK to architects table. Architecture is primary.';
COMMENT ON COLUMN destinations.architectural_significance IS 'Why this destination matters architecturally. Primary content, not metadata.';
COMMENT ON COLUMN destinations.design_story IS 'Rich narrative about the design. Editorial content.';
COMMENT ON COLUMN destinations.intelligence_score IS 'Score for travel intelligence ranking. Higher = more important for intelligence.';

