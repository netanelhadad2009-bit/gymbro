-- ============================================================================
-- Migration: Extend avatars.experience CHECK constraint to include 'results'
-- Date: 2025-11-03
-- Purpose: Allow 'results' as a valid experience value (legacy/edge case support)
-- Note: Code normalization still maps 'results' -> 'knowledge' for consistency
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
DO $$
BEGIN
  RAISE NOTICE '✓ avatars.experience CHECK constraint updated to include "results"';
  RAISE NOTICE '✓ Valid values: beginner, intermediate, advanced, knowledge, time, results';
  RAISE NOTICE '⚠ Note: Code normalization should still map "results" -> "knowledge"';
END $$;
