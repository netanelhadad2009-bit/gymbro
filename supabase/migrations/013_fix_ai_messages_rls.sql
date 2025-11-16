-- 013_fix_ai_messages_rls.sql
-- Fix RLS policies for ai_messages table to ensure proper authentication

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  profile_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_ai_messages_user_id_created_at
  ON public.ai_messages (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist (idempotent)
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_select_own') THEN
    DROP POLICY "ai_messages_select_own" ON public.ai_messages;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_insert_self') THEN
    DROP POLICY "ai_messages_insert_self" ON public.ai_messages;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_delete_own') THEN
    DROP POLICY "ai_messages_delete_own" ON public.ai_messages;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_update_own') THEN
    DROP POLICY "ai_messages_update_own" ON public.ai_messages;
  END IF;
END $$;

-- Recreate least-privilege policies
CREATE POLICY "ai_messages_select_own"
  ON public.ai_messages
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ai_messages_insert_self"
  ON public.ai_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_messages_update_own"
  ON public.ai_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_messages_delete_own"
  ON public.ai_messages
  FOR DELETE
  USING (auth.uid() = user_id);
