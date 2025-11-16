-- 016_fix_ai_messages_policies.sql
-- Auto-fix migration: ensures all RLS policies exist for ai_messages
-- Run this ONLY if the diagnostic shows missing policies

-- Enable RLS on ai_messages table
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy (owner can read own messages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_messages'
      AND policyname = 'ai_messages_select_own'
  ) THEN
    CREATE POLICY ai_messages_select_own
      ON public.ai_messages
      FOR SELECT
      USING (auth.uid() = user_id);
    RAISE NOTICE 'Created policy: ai_messages_select_own';
  END IF;
END $$;

-- Create INSERT policy (owner can insert own messages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_messages'
      AND policyname = 'ai_messages_insert_self'
  ) THEN
    CREATE POLICY ai_messages_insert_self
      ON public.ai_messages
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Created policy: ai_messages_insert_self';
  END IF;
END $$;

-- Create UPDATE policy (owner can update own messages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_messages'
      AND policyname = 'ai_messages_update_own'
  ) THEN
    CREATE POLICY ai_messages_update_own
      ON public.ai_messages
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Created policy: ai_messages_update_own';
  END IF;
END $$;

-- Create DELETE policy (owner can delete own messages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ai_messages'
      AND policyname = 'ai_messages_delete_own'
  ) THEN
    CREATE POLICY ai_messages_delete_own
      ON public.ai_messages
      FOR DELETE
      USING (auth.uid() = user_id);
    RAISE NOTICE 'Created policy: ai_messages_delete_own';
  END IF;
END $$;

-- Verify all policies were created
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

  IF policy_count = 4 THEN
    RAISE NOTICE '✅ All 4 RLS policies verified on ai_messages table';
  ELSE
    RAISE WARNING '⚠️  Expected 4 policies, found %. Check policy creation above.', policy_count;
  END IF;
END $$;

-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
