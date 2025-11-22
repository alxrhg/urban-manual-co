-- Create homepage_config table for visual homepage editor
CREATE TABLE IF NOT EXISTS homepage_config (
  id TEXT PRIMARY KEY DEFAULT 'main',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE homepage_config ENABLE ROW LEVEL SECURITY;

-- Allow admins to read and write
CREATE POLICY "Admins can manage homepage config"
  ON homepage_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'role')::text = 'admin'
    )
  );

-- Allow public read access
CREATE POLICY "Public can read homepage config"
  ON homepage_config
  FOR SELECT
  USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS homepage_config_id_idx ON homepage_config(id);

-- Insert default config
INSERT INTO homepage_config (id, config)
VALUES (
  'main',
  '{
    "hero": {
      "showGreeting": true,
      "showSearch": true,
      "showFilters": true
    },
    "layout": {
      "defaultView": "grid",
      "showViewToggle": true,
      "gridColumns": 3,
      "showMapOption": true
    },
    "sections": {
      "showTrending": true,
      "showRecommendations": true,
      "showSmartSuggestions": true,
      "showCollections": false
    },
    "navigation": {
      "showCityPills": true,
      "showCategoryPills": true,
      "showQuickActions": true
    }
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

