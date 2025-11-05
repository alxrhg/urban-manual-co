-- Add onboarding_completed field to user_profiles table
-- This tracks whether a user has completed the initial onboarding wizard

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups of users who haven't completed onboarding
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_completed
ON user_profiles(onboarding_completed);

-- Add onboarding_completed_at timestamp to track when onboarding was finished
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- For existing users, mark them as having completed onboarding
-- (they signed up before this feature existed)
UPDATE user_profiles
SET onboarding_completed = TRUE,
    onboarding_completed_at = created_at
WHERE onboarding_completed IS NULL OR onboarding_completed = FALSE;
