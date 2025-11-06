-- Add birthday field to user_profiles table
-- This allows users to optionally add their birthday to their profile

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.birthday IS 'User''s birthday (optional)';
