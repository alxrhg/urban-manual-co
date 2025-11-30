-- Add onboarding_completed column to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding ON user_profiles(onboarding_completed);

-- Comment for documentation
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether the user has completed the welcome onboarding flow';
