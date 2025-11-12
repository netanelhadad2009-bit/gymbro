-- ============================================================================
-- SQL Script: Update avatars.experience CHECK constraint
-- Date: 2025-11-03
-- Usage: Copy and paste into Supabase SQL Editor
-- ============================================================================

-- Drop existing CHECK constraint on experience
ALTER TABLE public.avatars
  DROP CONSTRAINT IF EXISTS avatars_experience_check;

-- Recreate with extended set including 'results'
ALTER TABLE public.avatars
  ADD CONSTRAINT avatars_experience_check
  CHECK (experience IN (
    'beginner',
    'intermediate',
    'advanced',
    'knowledge',
    'time',
    'results'     -- Added to support legacy data / edge cases
  ));

-- Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Verification
SELECT
  'avatars.experience CHECK constraint updated successfully' as status,
  'Valid values: beginner, intermediate, advanced, knowledge, time, results' as note;
