-- Add avatar resolution columns to avatars table
-- Date: 2025-11-19
-- Purpose: Add avatar_id, confidence, matched_rules, and reasons columns for avatar resolution system

-- Add avatar_id column (the resolved avatar identifier)
ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS avatar_id text;

-- Add confidence column (resolution confidence score 0-1 decimal)
ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS confidence numeric;

-- Add matched_rules column (array of rule IDs that matched)
ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS matched_rules jsonb DEFAULT '[]'::jsonb;

-- Add reasons column (array of human-readable reasons for the resolution)
ALTER TABLE public.avatars
ADD COLUMN IF NOT EXISTS reasons jsonb DEFAULT '[]'::jsonb;

-- Add comments to new columns
COMMENT ON COLUMN public.avatars.avatar_id IS 'Resolved avatar identifier from avatar resolution system';
COMMENT ON COLUMN public.avatars.confidence IS 'Confidence score (0-1 decimal) of avatar resolution';
COMMENT ON COLUMN public.avatars.matched_rules IS 'Array of rule IDs that matched during avatar resolution';
COMMENT ON COLUMN public.avatars.reasons IS 'Array of human-readable reasons explaining why this avatar was selected';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
DECLARE
  column_count integer;
BEGIN
  SELECT COUNT(*)
  INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'avatars'
    AND column_name IN ('avatar_id', 'confidence', 'matched_rules', 'reasons');

  IF column_count = 4 THEN
    RAISE NOTICE '✓ SUCCESS: Added 4 avatar resolution columns to avatars table';
  ELSE
    RAISE WARNING '⚠ ISSUE: Expected 4 new columns, found %', column_count;
  END IF;
END $$;
