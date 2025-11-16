-- Add has_completed_onboarding column to profiles table
-- This tracks whether a user has finished the onboarding questionnaire

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding
ON profiles(has_completed_onboarding);

-- Add comment for documentation
COMMENT ON COLUMN profiles.has_completed_onboarding IS
'Tracks whether user has completed the onboarding questionnaire. Used by middleware for routing.';
