-- Migration: Fix user_profiles RLS to allow anonymous access to public profiles
-- This fixes 400/406 errors when accessing user_profiles without authentication

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (we'll recreate them)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;

-- Policy 1: Allow anonymous users to read public profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON user_profiles
  FOR SELECT
  TO anon, authenticated
  USING (is_public = true OR auth.uid() = user_id);

-- Policy 2: Allow authenticated users to read their own profile (even if private)
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 3: Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 5: Allow service role full access
CREATE POLICY "Service role can manage all profiles"
  ON user_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE user_profiles IS 'User profiles with RLS: public profiles viewable by all, private profiles only by owner';

