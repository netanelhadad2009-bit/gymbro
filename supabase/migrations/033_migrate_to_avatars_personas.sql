-- ============================================================================
-- Migration: Unify avatar system to public.avatars with persona columns
-- Date: 2025-11-03
-- Purpose: Replace user_avatar table with avatars table using explicit persona columns
-- ============================================================================

-- Step 1: Drop old avatars table if exists (from previous attempts)
DROP TABLE IF EXISTS public.avatars CASCADE;

-- Step 2: Create new avatars table with individual persona columns
CREATE TABLE public.avatars (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  goal text NOT NULL CHECK (goal IN ('loss', 'bulk', 'recomp', 'cut')),
  diet text NOT NULL CHECK (diet IN ('vegan', 'keto', 'balanced', 'vegetarian', 'paleo', 'none')),
  frequency text NOT NULL CHECK (frequency IN ('low', 'medium', 'high')),
  experience text NOT NULL CHECK (experience IN ('beginner', 'intermediate', 'advanced', 'knowledge', 'time')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Create index on user_id (covered by PK but explicit for documentation)
CREATE INDEX IF NOT EXISTS idx_avatars_user_id ON public.avatars(user_id);

-- Step 4: Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_avatars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger
DROP TRIGGER IF EXISTS trigger_update_avatars_updated_at ON public.avatars;
CREATE TRIGGER trigger_update_avatars_updated_at
  BEFORE UPDATE ON public.avatars
  FOR EACH ROW
  EXECUTE FUNCTION public.update_avatars_updated_at();

-- Step 6: Enable Row Level Security
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies
DROP POLICY IF EXISTS "avatars_select_own" ON public.avatars;
CREATE POLICY "avatars_select_own"
  ON public.avatars
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "avatars_insert_own" ON public.avatars;
CREATE POLICY "avatars_insert_own"
  ON public.avatars
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "avatars_update_own" ON public.avatars;
CREATE POLICY "avatars_update_own"
  ON public.avatars
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Step 8: Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.avatars TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Step 9: Add table comment
COMMENT ON TABLE public.avatars IS 'User persona data for personalized journey generation. Uses individual columns (not JSONB). Replaces legacy user_avatar table.';

-- Step 10: Reload PostgREST schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- Step 11: Verification - Check that all required columns exist
DO $$
DECLARE
  column_count integer;
  table_exists boolean;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'avatars'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'FATAL: avatars table was not created';
  END IF;

  -- Check column count
  SELECT COUNT(*)
  INTO column_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'avatars'
    AND column_name IN ('user_id', 'gender', 'goal', 'diet', 'frequency', 'experience');

  IF column_count != 6 THEN
    RAISE EXCEPTION 'FATAL: avatars table has % persona columns (expected 6)', column_count;
  END IF;

  -- Success
  RAISE NOTICE '✓ SUCCESS: public.avatars table created with 6 persona columns';
  RAISE NOTICE '✓ Columns: user_id, gender, goal, diet, frequency, experience';
  RAISE NOTICE '✓ RLS enabled with 3 policies (SELECT, INSERT, UPDATE)';
  RAISE NOTICE '✓ Auto-update trigger configured for updated_at';
  RAISE NOTICE '✓ PostgREST schema cache reload requested';
END $$;

-- Step 12: Optional - Migrate data from user_avatar if it exists
-- Uncomment this block if you want to preserve existing avatar assignments
/*
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'user_avatar'
  ) THEN
    -- This is a simplified migration - adjust based on your avatar_id to persona mapping
    -- You would need to implement a mapping from avatar_id to persona attributes
    RAISE NOTICE '⚠ user_avatar table exists - manual data migration required';
    RAISE NOTICE '⚠ Define mapping from avatar_id to (gender, goal, diet, frequency, experience)';
  ELSE
    RAISE NOTICE '✓ No user_avatar table found - fresh start';
  END IF;
END $$;
*/
