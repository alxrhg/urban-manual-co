-- Migration 400: Collections/Lists System
-- Allows users to organize saved places into themed collections

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  cover_image TEXT,
  slug TEXT, -- For public sharing URLs
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collection items (places in lists)
CREATE TABLE IF NOT EXISTS collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  destination_slug TEXT NOT NULL,
  notes TEXT,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collection_id, destination_slug)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_is_public ON collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_destination_slug ON collection_items(destination_slug);
CREATE INDEX IF NOT EXISTS idx_collection_items_position ON collection_items(collection_id, position);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_collections_updated_at_trigger ON collections;
CREATE TRIGGER update_collections_updated_at_trigger
  BEFORE UPDATE ON collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collections_updated_at();

-- Function to generate unique slug for collection
CREATE OR REPLACE FUNCTION generate_collection_slug(collection_name TEXT, user_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base slug from collection name
  base_slug := lower(regexp_replace(collection_name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;

  -- Check if slug exists and add counter if needed
  WHILE EXISTS (SELECT 1 FROM collections WHERE slug = final_slug AND collections.user_id != generate_collection_slug.user_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) policies
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Users can view their own collections
CREATE POLICY collections_select_own ON collections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public collections
CREATE POLICY collections_select_public ON collections
  FOR SELECT
  USING (is_public = true);

-- Users can create their own collections
CREATE POLICY collections_insert_own ON collections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own collections
CREATE POLICY collections_update_own ON collections
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own collections
CREATE POLICY collections_delete_own ON collections
  FOR DELETE
  USING (auth.uid() = user_id);

-- Collection items: Users can view items in their collections or public collections
CREATE POLICY collection_items_select ON collection_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND (collections.user_id = auth.uid() OR collections.is_public = true)
    )
  );

-- Collection items: Users can insert items into their own collections
CREATE POLICY collection_items_insert ON collection_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- Collection items: Users can update items in their own collections
CREATE POLICY collection_items_update ON collection_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- Collection items: Users can delete items from their own collections
CREATE POLICY collection_items_delete ON collection_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON collections TO authenticated;
GRANT ALL ON collection_items TO authenticated;
GRANT USAGE ON SEQUENCE collections_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE collection_items_id_seq TO authenticated;

-- Create default collections for existing users
-- Note: This will be done via application code, not in migration
