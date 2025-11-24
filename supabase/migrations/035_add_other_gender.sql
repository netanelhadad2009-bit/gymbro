-- Add 'other' to gender constraint in profiles table
-- This allows users to select "other" as their gender during onboarding

-- Drop existing gender constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_gender_check;

-- Add new constraint that includes 'other'
ALTER TABLE profiles
  ADD CONSTRAINT profiles_gender_check CHECK (gender IN ('male', 'female', 'other'));
