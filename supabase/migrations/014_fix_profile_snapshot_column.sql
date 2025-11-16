-- 014_fix_profile_snapshot_column.sql
-- Fix schema cache issue: ensure profile_snapshot column exists and reload PostgREST schema

-- Add profile_snapshot column if missing (idempotent)
ALTER TABLE public.ai_messages
  ADD COLUMN IF NOT EXISTS profile_snapshot jsonb;

-- Add GIN index for efficient JSONB queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_ai_messages_profile_snapshot
  ON public.ai_messages USING gin (profile_snapshot);

-- Add comment for documentation
COMMENT ON COLUMN public.ai_messages.profile_snapshot IS
  'Snapshot of user profile at time of message (age, gender, weight, goals, diet, injuries, etc.)';

-- Verify RLS policies exist (should have been created in 013_fix_ai_messages_rls.sql)
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'ai_messages'
    AND policyname IN (
      'ai_messages_select_own',
      'ai_messages_insert_self',
      'ai_messages_update_own',
      'ai_messages_delete_own'
    );

  IF policy_count < 4 THEN
    RAISE WARNING 'Expected 4 RLS policies on ai_messages, found %. Run migration 013 first.', policy_count;
  ELSE
    RAISE NOTICE 'All 4 RLS policies verified on ai_messages table';
  END IF;
END $$;

-- Force PostgREST to reload schema cache
-- This fixes the "Could not find the 'profile_snapshot' column" error
NOTIFY pgrst, 'reload schema';
