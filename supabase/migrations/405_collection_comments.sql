-- Migration 405: Collection Comments
-- Add ability for users to comment on public collections

-- Collection comments table
CREATE TABLE IF NOT EXISTS collection_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment count to collections table
ALTER TABLE collections ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collection_comments_collection_id ON collection_comments(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_comments_user_id ON collection_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_comments_created_at ON collection_comments(created_at DESC);

-- RLS policies
ALTER TABLE collection_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can view comments on public collections
CREATE POLICY collection_comments_select_public ON collection_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_comments.collection_id
      AND collections.is_public = true
    )
  );

-- Users can view comments on their own collections (even if private)
CREATE POLICY collection_comments_select_own ON collection_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_comments.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- Users can insert comments on public collections
CREATE POLICY collection_comments_insert_on_public ON collection_comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_id
      AND collections.is_public = true
    )
  );

-- Users can update their own comments
CREATE POLICY collection_comments_update_own ON collection_comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY collection_comments_delete_own ON collection_comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Collection owners can delete any comment on their collections
CREATE POLICY collection_comments_delete_by_owner ON collection_comments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_comments.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- Function to update comment count
CREATE OR REPLACE FUNCTION update_collection_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE collections
    SET comment_count = comment_count + 1
    WHERE id = NEW.collection_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE collections
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = OLD.collection_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update comment count
DROP TRIGGER IF EXISTS update_collection_comment_count_trigger ON collection_comments;
CREATE TRIGGER update_collection_comment_count_trigger
  AFTER INSERT OR DELETE ON collection_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_comment_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collection_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS update_collection_comment_updated_at_trigger ON collection_comments;
CREATE TRIGGER update_collection_comment_updated_at_trigger
  BEFORE UPDATE ON collection_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_comment_updated_at();

-- Grant permissions
GRANT ALL ON collection_comments TO authenticated;

COMMENT ON TABLE collection_comments IS 'Comments on public collections';
COMMENT ON COLUMN collection_comments.comment_text IS 'The comment content';
