-- CMS Page Builder Schema
-- Framer-like visual page builder with blocks, layouts, and version history

-- =====================================================
-- PAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cms_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  description TEXT,
  meta_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_homepage BOOLEAN DEFAULT FALSE,
  layout_config JSONB DEFAULT '{
    "maxWidth": "1280px",
    "padding": { "x": 16, "y": 24 },
    "gap": 16
  }'::jsonb,
  seo_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- BLOCKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS cms_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES cms_blocks(id) ON DELETE CASCADE, -- For nested blocks
  type TEXT NOT NULL, -- hero, text, image, grid, card, etc.
  name TEXT, -- User-friendly name for the block
  props JSONB DEFAULT '{}'::jsonb, -- Block-specific properties
  styles JSONB DEFAULT '{
    "desktop": {},
    "tablet": {},
    "mobile": {}
  }'::jsonb,
  position INTEGER NOT NULL DEFAULT 0, -- Order within parent/page
  is_locked BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- BLOCK DEFINITIONS (Registry of available block types)
-- =====================================================
CREATE TABLE IF NOT EXISTS cms_block_definitions (
  type TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Lucide icon name
  category TEXT NOT NULL DEFAULT 'basic', -- layout, content, media, interactive
  props_schema JSONB NOT NULL DEFAULT '{}'::jsonb, -- JSON Schema for props validation
  default_props JSONB DEFAULT '{}'::jsonb,
  default_styles JSONB DEFAULT '{}'::jsonb,
  supports_children BOOLEAN DEFAULT FALSE,
  max_children INTEGER,
  allowed_children TEXT[], -- Array of allowed child block types
  is_builtin BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PAGE VERSIONS (Undo/Redo and History)
-- =====================================================
CREATE TABLE IF NOT EXISTS cms_page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES cms_pages(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL, -- Full page + blocks snapshot
  change_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(page_id, version_number)
);

-- =====================================================
-- TEMPLATES
-- =====================================================
CREATE TABLE IF NOT EXISTS cms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail TEXT,
  category TEXT DEFAULT 'page', -- page, section, block
  snapshot JSONB NOT NULL, -- Page or blocks configuration
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- ASSETS (Extended media management)
-- =====================================================
CREATE TABLE IF NOT EXISTS cms_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL, -- image, video, document, font
  mime_type TEXT,
  size INTEGER, -- bytes
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  folder TEXT DEFAULT '/',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- DESIGN TOKENS (Colors, Typography, Spacing)
-- =====================================================
CREATE TABLE IF NOT EXISTS cms_design_tokens (
  id TEXT PRIMARY KEY DEFAULT 'default',
  colors JSONB DEFAULT '{
    "primary": "#000000",
    "secondary": "#666666",
    "accent": "#0066FF",
    "background": "#FFFFFF",
    "surface": "#F5F5F5",
    "text": "#111111",
    "muted": "#888888"
  }'::jsonb,
  typography JSONB DEFAULT '{
    "fontFamily": {
      "sans": "Inter, system-ui, sans-serif",
      "serif": "Georgia, serif",
      "mono": "JetBrains Mono, monospace"
    },
    "fontSize": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
      "4xl": "2.25rem",
      "5xl": "3rem"
    },
    "fontWeight": {
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    "lineHeight": {
      "tight": 1.25,
      "normal": 1.5,
      "relaxed": 1.75
    }
  }'::jsonb,
  spacing JSONB DEFAULT '{
    "0": "0",
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "5": "1.25rem",
    "6": "1.5rem",
    "8": "2rem",
    "10": "2.5rem",
    "12": "3rem",
    "16": "4rem",
    "20": "5rem",
    "24": "6rem"
  }'::jsonb,
  breakpoints JSONB DEFAULT '{
    "mobile": "375px",
    "tablet": "768px",
    "desktop": "1024px",
    "wide": "1280px"
  }'::jsonb,
  shadows JSONB DEFAULT '{
    "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "md": "0 4px 6px -1px rgb(0 0 0 / 0.1)",
    "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1)"
  }'::jsonb,
  borders JSONB DEFAULT '{
    "radius": {
      "none": "0",
      "sm": "0.125rem",
      "md": "0.375rem",
      "lg": "0.5rem",
      "xl": "0.75rem",
      "2xl": "1rem",
      "full": "9999px"
    }
  }'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS cms_pages_slug_idx ON cms_pages(slug);
CREATE INDEX IF NOT EXISTS cms_pages_status_idx ON cms_pages(status);
CREATE INDEX IF NOT EXISTS cms_blocks_page_id_idx ON cms_blocks(page_id);
CREATE INDEX IF NOT EXISTS cms_blocks_parent_id_idx ON cms_blocks(parent_id);
CREATE INDEX IF NOT EXISTS cms_blocks_position_idx ON cms_blocks(page_id, parent_id, position);
CREATE INDEX IF NOT EXISTS cms_page_versions_page_id_idx ON cms_page_versions(page_id);
CREATE INDEX IF NOT EXISTS cms_assets_folder_idx ON cms_assets(folder);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_block_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms_design_tokens ENABLE ROW LEVEL SECURITY;

-- Admin policies for all CMS tables
CREATE POLICY "Admins can manage CMS pages"
  ON cms_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Public can read published pages"
  ON cms_pages FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can manage CMS blocks"
  ON cms_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Public can read blocks of published pages"
  ON cms_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cms_pages
      WHERE cms_pages.id = cms_blocks.page_id
      AND cms_pages.status = 'published'
    )
  );

CREATE POLICY "Anyone can read block definitions"
  ON cms_block_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage block definitions"
  ON cms_block_definitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Admins can manage page versions"
  ON cms_page_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Admins can manage templates"
  ON cms_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Public can read public templates"
  ON cms_templates FOR SELECT
  USING (is_public = true);

CREATE POLICY "Admins can manage assets"
  ON cms_assets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'admin'
    )
  );

CREATE POLICY "Anyone can read design tokens"
  ON cms_design_tokens FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage design tokens"
  ON cms_design_tokens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'admin'
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create a new version snapshot
CREATE OR REPLACE FUNCTION cms_create_version_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
  snapshot JSONB;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM cms_page_versions
  WHERE page_id = NEW.id;

  -- Create snapshot of page and blocks
  SELECT jsonb_build_object(
    'page', row_to_json(NEW),
    'blocks', COALESCE(
      (SELECT jsonb_agg(row_to_json(b) ORDER BY b.position)
       FROM cms_blocks b
       WHERE b.page_id = NEW.id),
      '[]'::jsonb
    )
  ) INTO snapshot;

  -- Insert version (limit to last 50 versions per page)
  INSERT INTO cms_page_versions (page_id, version_number, snapshot, created_by)
  VALUES (NEW.id, next_version, snapshot, NEW.updated_by);

  -- Clean up old versions (keep last 50)
  DELETE FROM cms_page_versions
  WHERE page_id = NEW.id
  AND version_number < (next_version - 50);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-versioning (optional, can be called manually instead)
-- CREATE TRIGGER cms_page_version_trigger
--   AFTER UPDATE ON cms_pages
--   FOR EACH ROW
--   EXECUTE FUNCTION cms_create_version_snapshot();

-- Function to restore a version
CREATE OR REPLACE FUNCTION cms_restore_version(
  p_page_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_snapshot JSONB;
  v_page JSONB;
  v_blocks JSONB;
BEGIN
  -- Get the version snapshot
  SELECT snapshot INTO v_snapshot
  FROM cms_page_versions
  WHERE page_id = p_page_id AND version_number = p_version_number;

  IF v_snapshot IS NULL THEN
    RETURN FALSE;
  END IF;

  v_page := v_snapshot->'page';
  v_blocks := v_snapshot->'blocks';

  -- Delete current blocks
  DELETE FROM cms_blocks WHERE page_id = p_page_id;

  -- Restore blocks from snapshot
  INSERT INTO cms_blocks (id, page_id, parent_id, type, name, props, styles, position, is_locked, is_hidden)
  SELECT
    (b->>'id')::UUID,
    p_page_id,
    (b->>'parent_id')::UUID,
    b->>'type',
    b->>'name',
    (b->'props')::JSONB,
    (b->'styles')::JSONB,
    (b->>'position')::INTEGER,
    (b->>'is_locked')::BOOLEAN,
    (b->>'is_hidden')::BOOLEAN
  FROM jsonb_array_elements(v_blocks) AS b;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INSERT DEFAULT BLOCK DEFINITIONS
-- =====================================================
INSERT INTO cms_block_definitions (type, label, description, icon, category, props_schema, default_props, supports_children, allowed_children) VALUES
-- Layout blocks
('container', 'Container', 'A flexible container for grouping blocks', 'Box', 'layout',
  '{"type": "object", "properties": {"maxWidth": {"type": "string"}, "padding": {"type": "object"}, "align": {"type": "string", "enum": ["left", "center", "right"]}}}',
  '{"maxWidth": "1280px", "padding": {"x": 16, "y": 24}, "align": "center"}',
  true, ARRAY['hero', 'text', 'heading', 'image', 'grid', 'columns', 'card', 'button', 'spacer', 'divider', 'destination-card', 'destination-grid']),

('columns', 'Columns', 'Multi-column layout', 'Columns', 'layout',
  '{"type": "object", "properties": {"columns": {"type": "integer", "minimum": 1, "maximum": 12}, "gap": {"type": "integer"}, "responsive": {"type": "object"}}}',
  '{"columns": 2, "gap": 24, "responsive": {"tablet": 2, "mobile": 1}}',
  true, ARRAY['container', 'text', 'heading', 'image', 'card', 'button']),

('grid', 'Grid', 'Responsive grid layout', 'Grid3x3', 'layout',
  '{"type": "object", "properties": {"columns": {"type": "object"}, "gap": {"type": "integer"}, "rowGap": {"type": "integer"}}}',
  '{"columns": {"desktop": 3, "tablet": 2, "mobile": 1}, "gap": 24}',
  true, ARRAY['card', 'image', 'destination-card']),

('section', 'Section', 'Full-width section with background', 'Layout', 'layout',
  '{"type": "object", "properties": {"background": {"type": "string"}, "padding": {"type": "object"}, "fullWidth": {"type": "boolean"}}}',
  '{"background": "transparent", "padding": {"y": 64}, "fullWidth": true}',
  true, ARRAY['container', 'columns', 'grid', 'hero', 'text', 'heading', 'image']),

-- Content blocks
('heading', 'Heading', 'Text heading (H1-H6)', 'Type', 'content',
  '{"type": "object", "properties": {"text": {"type": "string"}, "level": {"type": "integer", "minimum": 1, "maximum": 6}, "align": {"type": "string"}}}',
  '{"text": "Heading", "level": 2, "align": "left"}',
  false, NULL),

('text', 'Text', 'Rich text content', 'AlignLeft', 'content',
  '{"type": "object", "properties": {"content": {"type": "string"}, "align": {"type": "string"}, "size": {"type": "string"}}}',
  '{"content": "Enter your text here...", "align": "left", "size": "base"}',
  false, NULL),

('button', 'Button', 'Call-to-action button', 'MousePointer2', 'content',
  '{"type": "object", "properties": {"text": {"type": "string"}, "url": {"type": "string"}, "variant": {"type": "string"}, "size": {"type": "string"}, "icon": {"type": "string"}}}',
  '{"text": "Click me", "url": "#", "variant": "primary", "size": "md"}',
  false, NULL),

-- Media blocks
('image', 'Image', 'Single image with options', 'Image', 'media',
  '{"type": "object", "properties": {"src": {"type": "string"}, "alt": {"type": "string"}, "objectFit": {"type": "string"}, "aspectRatio": {"type": "string"}, "rounded": {"type": "string"}}}',
  '{"src": "", "alt": "", "objectFit": "cover", "aspectRatio": "16/9", "rounded": "lg"}',
  false, NULL),

('video', 'Video', 'Video embed or upload', 'Video', 'media',
  '{"type": "object", "properties": {"src": {"type": "string"}, "poster": {"type": "string"}, "autoplay": {"type": "boolean"}, "loop": {"type": "boolean"}, "muted": {"type": "boolean"}}}',
  '{"src": "", "autoplay": false, "loop": false, "muted": true}',
  false, NULL),

('hero', 'Hero', 'Large hero section with image/video background', 'Maximize2', 'media',
  '{"type": "object", "properties": {"title": {"type": "string"}, "subtitle": {"type": "string"}, "backgroundImage": {"type": "string"}, "backgroundVideo": {"type": "string"}, "overlay": {"type": "number"}, "height": {"type": "string"}, "align": {"type": "string"}, "cta": {"type": "object"}}}',
  '{"title": "Welcome", "subtitle": "Your journey starts here", "height": "70vh", "overlay": 0.4, "align": "center"}',
  false, NULL),

-- Interactive blocks
('card', 'Card', 'Content card with image and text', 'CreditCard', 'interactive',
  '{"type": "object", "properties": {"title": {"type": "string"}, "description": {"type": "string"}, "image": {"type": "string"}, "url": {"type": "string"}, "badge": {"type": "string"}}}',
  '{"title": "Card Title", "description": "Card description goes here", "image": "", "url": "#"}',
  false, NULL),

('accordion', 'Accordion', 'Expandable content sections', 'ChevronDown', 'interactive',
  '{"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}}}}}',
  '{"items": [{"title": "Question 1", "content": "Answer 1"}]}',
  false, NULL),

('tabs', 'Tabs', 'Tabbed content sections', 'LayoutList', 'interactive',
  '{"type": "object", "properties": {"items": {"type": "array", "items": {"type": "object", "properties": {"label": {"type": "string"}, "content": {"type": "string"}}}}}}',
  '{"items": [{"label": "Tab 1", "content": "Content 1"}]}',
  false, NULL),

-- Utility blocks
('spacer', 'Spacer', 'Vertical spacing', 'Space', 'utility',
  '{"type": "object", "properties": {"height": {"type": "object"}}}',
  '{"height": {"desktop": 64, "tablet": 48, "mobile": 32}}',
  false, NULL),

('divider', 'Divider', 'Horizontal line separator', 'Minus', 'utility',
  '{"type": "object", "properties": {"color": {"type": "string"}, "thickness": {"type": "integer"}, "style": {"type": "string"}}}',
  '{"color": "#E5E5E5", "thickness": 1, "style": "solid"}',
  false, NULL),

('code', 'Code Block', 'Syntax-highlighted code', 'Code', 'utility',
  '{"type": "object", "properties": {"code": {"type": "string"}, "language": {"type": "string"}, "showLineNumbers": {"type": "boolean"}}}',
  '{"code": "", "language": "javascript", "showLineNumbers": true}',
  false, NULL),

-- Domain-specific blocks (Urban Manual)
('destination-card', 'Destination Card', 'Curated destination card', 'MapPin', 'domain',
  '{"type": "object", "properties": {"destinationId": {"type": "integer"}, "destinationSlug": {"type": "string"}, "variant": {"type": "string"}}}',
  '{"variant": "default"}',
  false, NULL),

('destination-grid', 'Destination Grid', 'Grid of destination cards', 'Map', 'domain',
  '{"type": "object", "properties": {"filter": {"type": "object"}, "limit": {"type": "integer"}, "columns": {"type": "object"}}}',
  '{"filter": {}, "limit": 6, "columns": {"desktop": 3, "tablet": 2, "mobile": 1}}',
  false, NULL),

('city-showcase', 'City Showcase', 'Featured city section', 'Building2', 'domain',
  '{"type": "object", "properties": {"city": {"type": "string"}, "showMap": {"type": "boolean"}, "limit": {"type": "integer"}}}',
  '{"city": "", "showMap": true, "limit": 4}',
  false, NULL),

('collection-preview', 'Collection Preview', 'Preview of a user collection', 'Bookmark', 'domain',
  '{"type": "object", "properties": {"collectionId": {"type": "string"}, "title": {"type": "string"}, "showAll": {"type": "boolean"}}}',
  '{"showAll": true}',
  false, NULL)

ON CONFLICT (type) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  props_schema = EXCLUDED.props_schema,
  default_props = EXCLUDED.default_props,
  supports_children = EXCLUDED.supports_children,
  allowed_children = EXCLUDED.allowed_children;

-- Insert default design tokens
INSERT INTO cms_design_tokens (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;
