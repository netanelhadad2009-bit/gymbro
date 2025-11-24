-- ============================================================================
-- Add birthdate column to profiles table
-- ============================================================================
-- Adds birthdate field to store exact date of birth instead of just calculated age
-- This provides more accurate age calculations and prevents age from becoming stale

-- Add birthdate column (nullable to support existing users)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birthdate DATE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_birthdate ON public.profiles (birthdate);

-- Add comment
COMMENT ON COLUMN public.profiles.birthdate IS 'User date of birth - more accurate than age field which becomes stale';

-- Note: We keep the age column for backwards compatibility and as a fallback
-- Frontend should prioritize birthdate over age when both are available
