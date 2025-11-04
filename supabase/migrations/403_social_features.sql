-- Migration 403: Social Features
-- Follow travelers, see friends' activity, like places

-- User follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id) -- Can't follow yourself
);

-- Activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- 'visited', 'saved', 'collection_created', 'achievement_unlocked'
  destination_slug TEXT,
  collection_id UUID REFERENCES collections(id) ON DELETE CASCADE,
  achievement_code TEXT,
  metadata JSONB, -- Additional data (e.g., rating, notes, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Place likes table (users can like destinations)
CREATE TABLE IF NOT EXISTS place_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination_slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, destination_slug)
);

-- Collection likes table
CREATE TABLE IF NOT EXISTS collection_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, collection_id)
);

-- User profile enhancements for social
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS location TEXT; -- User's home city
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_place_likes_user_id ON place_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_place_likes_destination ON place_likes(destination_slug);
CREATE INDEX IF NOT EXISTS idx_collection_likes_user_id ON collection_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_likes_collection ON collection_likes(collection_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_public ON user_profiles(user_id) WHERE is_public = true;

-- RLS policies
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_likes ENABLE ROW LEVEL SECURITY;

-- Follows: Users can view all follows
CREATE POLICY user_follows_select_all ON user_follows
  FOR SELECT
  USING (true);

-- Follows: Users can create their own follows
CREATE POLICY user_follows_insert_own ON user_follows
  FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

-- Follows: Users can delete their own follows
CREATE POLICY user_follows_delete_own ON user_follows
  FOR DELETE
  USING (auth.uid() = follower_id);

-- Activity feed: Users can view their own activity
CREATE POLICY activity_feed_select_own ON activity_feed
  FOR SELECT
  USING (auth.uid() = user_id);

-- Activity feed: Users can view activity of people they follow
CREATE POLICY activity_feed_select_following ON activity_feed
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_follows
      WHERE user_follows.following_id = activity_feed.user_id
      AND user_follows.follower_id = auth.uid()
    )
  );

-- Activity feed: Users can view activity from public profiles
CREATE POLICY activity_feed_select_public ON activity_feed
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = activity_feed.user_id
      AND user_profiles.is_public = true
    )
  );

-- Activity feed: Only system can insert (via triggers/functions)
-- Users shouldn't manually insert activity

-- Place likes: Everyone can see likes
CREATE POLICY place_likes_select_all ON place_likes
  FOR SELECT
  USING (true);

-- Place likes: Users can insert their own likes
CREATE POLICY place_likes_insert_own ON place_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Place likes: Users can delete their own likes
CREATE POLICY place_likes_delete_own ON place_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Collection likes: Everyone can see likes
CREATE POLICY collection_likes_select_all ON collection_likes
  FOR SELECT
  USING (true);

-- Collection likes: Users can insert their own likes
CREATE POLICY collection_likes_insert_own ON collection_likes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Collection likes: Users can delete their own likes
CREATE POLICY collection_likes_delete_own ON collection_likes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update follower counts
CREATE OR REPLACE FUNCTION update_follower_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment following count for follower
    UPDATE user_profiles
    SET following_count = following_count + 1
    WHERE user_id = NEW.follower_id;

    -- Increment follower count for following
    UPDATE user_profiles
    SET follower_count = follower_count + 1
    WHERE user_id = NEW.following_id;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement following count for follower
    UPDATE user_profiles
    SET following_count = GREATEST(0, following_count - 1)
    WHERE user_id = OLD.follower_id;

    -- Decrement follower count for following
    UPDATE user_profiles
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE user_id = OLD.following_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update follower counts
DROP TRIGGER IF EXISTS update_follower_counts_trigger ON user_follows;
CREATE TRIGGER update_follower_counts_trigger
  AFTER INSERT OR DELETE ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_follower_counts();

-- Function to create activity feed entry when user visits a place
CREATE OR REPLACE FUNCTION create_activity_on_visit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_feed (user_id, activity_type, destination_slug, metadata, created_at)
  VALUES (
    NEW.user_id,
    'visited',
    NEW.destination_slug,
    jsonb_build_object(
      'rating', NEW.rating,
      'has_notes', (NEW.notes IS NOT NULL AND NEW.notes != '')
    ),
    NEW.visited_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create activity on visit
DROP TRIGGER IF EXISTS create_activity_on_visit_trigger ON visited_places;
CREATE TRIGGER create_activity_on_visit_trigger
  AFTER INSERT ON visited_places
  FOR EACH ROW
  EXECUTE FUNCTION create_activity_on_visit();

-- Function to create activity feed entry when user saves a place
CREATE OR REPLACE FUNCTION create_activity_on_save()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_feed (user_id, activity_type, destination_slug, created_at)
  VALUES (NEW.user_id, 'saved', NEW.destination_slug, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create activity on save
DROP TRIGGER IF EXISTS create_activity_on_save_trigger ON saved_places;
CREATE TRIGGER create_activity_on_save_trigger
  AFTER INSERT ON saved_places
  FOR EACH ROW
  EXECUTE FUNCTION create_activity_on_save();

-- Function to create activity feed entry when user creates a collection
CREATE OR REPLACE FUNCTION create_activity_on_collection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_public THEN
    INSERT INTO activity_feed (user_id, activity_type, collection_id, metadata, created_at)
    VALUES (
      NEW.user_id,
      'collection_created',
      NEW.id,
      jsonb_build_object('collection_name', NEW.name),
      NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create activity on collection creation
DROP TRIGGER IF EXISTS create_activity_on_collection_trigger ON collections;
CREATE TRIGGER create_activity_on_collection_trigger
  AFTER INSERT ON collections
  FOR EACH ROW
  EXECUTE FUNCTION create_activity_on_collection();

-- Grant permissions
GRANT ALL ON user_follows TO authenticated;
GRANT ALL ON activity_feed TO authenticated;
GRANT ALL ON place_likes TO authenticated;
GRANT ALL ON collection_likes TO authenticated;

COMMENT ON TABLE user_follows IS 'Social graph: who follows whom';
COMMENT ON TABLE activity_feed IS 'Activity feed for social features';
COMMENT ON TABLE place_likes IS 'Users can like destinations';
COMMENT ON TABLE collection_likes IS 'Users can like collections';
