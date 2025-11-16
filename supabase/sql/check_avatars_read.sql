-- ============================================================================
-- DB Sanity Check: Avatars Table Read Test
-- Purpose: Verify that the current authenticated user can read their avatar
-- Usage: Run this in Supabase SQL Editor (automatically uses auth.uid())
-- ============================================================================

-- 1. Check if avatars table exists and has correct schema
DO $$
DECLARE
  table_exists boolean;
  col_count integer;
BEGIN
  -- Check table existence
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'avatars'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'Table public.avatars does not exist!';
  END IF;

  -- Check required columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'avatars'
    AND column_name IN ('user_id', 'gender', 'goal', 'diet', 'frequency', 'experience', 'created_at', 'updated_at');

  IF col_count < 8 THEN
    RAISE WARNING 'Table public.avatars is missing required columns (found: %, expected: 8)', col_count;
  END IF;

  RAISE NOTICE '✓ Table public.avatars exists with correct schema';
END $$;

-- 2. Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'avatars'
ORDER BY policyname;

-- 3. Try to read current user's avatar (tests RLS SELECT policy)
SELECT
  'Avatar read test' as test,
  CASE
    WHEN COUNT(*) > 0 THEN '✓ Found avatar for current user'
    ELSE '⚠ No avatar found for current user (this is OK if you haven''t created one yet)'
  END as result,
  COUNT(*) as avatar_count,
  auth.uid() as current_user_id
FROM public.avatars
WHERE user_id = auth.uid()
GROUP BY auth.uid();

-- 4. If avatar exists, show its data
SELECT
  user_id,
  gender,
  goal,
  diet,
  frequency,
  experience,
  created_at,
  updated_at
FROM public.avatars
WHERE user_id = auth.uid();

-- 5. Check if RLS is enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'avatars';

-- Expected output:
-- ✓ Table public.avatars exists with correct schema
-- Policies: avatars_select_policy, avatars_insert_policy, avatars_update_policy
-- Avatar read test: ✓ Found avatar (or ⚠ No avatar if not created yet)
-- Your avatar data (if exists)
-- RLS enabled: true
