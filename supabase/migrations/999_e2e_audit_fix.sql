-- ============================================
-- E2E Audit & Fix - GymBro AI Coach
-- ============================================
-- This migration is IDEMPOTENT - safe to run multiple times
-- Fixes: RLS policies, realtime publication, replica identity, triggers

-- ============================================
-- 1. ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weigh_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. AI_MESSAGES: COMPLETE RLS POLICIES
-- ============================================

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "ai_messages_select_own" ON public.ai_messages;
DROP POLICY IF EXISTS "ai_messages_insert_own" ON public.ai_messages;
DROP POLICY IF EXISTS "ai_messages_update_own" ON public.ai_messages;
DROP POLICY IF EXISTS "ai_messages_delete_own" ON public.ai_messages;

-- SELECT: Users can only see their own messages
CREATE POLICY "ai_messages_select_own" ON public.ai_messages
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert messages for themselves
CREATE POLICY "ai_messages_insert_own" ON public.ai_messages
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own messages
CREATE POLICY "ai_messages_update_own" ON public.ai_messages
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own messages
CREATE POLICY "ai_messages_delete_own" ON public.ai_messages
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. MEALS: COMPLETE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "meals_select_own" ON public.meals;
DROP POLICY IF EXISTS "meals_insert_own" ON public.meals;
DROP POLICY IF EXISTS "meals_update_own" ON public.meals;
DROP POLICY IF EXISTS "meals_delete_own" ON public.meals;

CREATE POLICY "meals_select_own" ON public.meals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "meals_insert_own" ON public.meals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meals_update_own" ON public.meals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "meals_delete_own" ON public.meals
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 4. WEIGH_INS: COMPLETE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "weigh_ins_select_own" ON public.weigh_ins;
DROP POLICY IF EXISTS "weigh_ins_insert_own" ON public.weigh_ins;
DROP POLICY IF EXISTS "weigh_ins_update_own" ON public.weigh_ins;
DROP POLICY IF EXISTS "weigh_ins_delete_own" ON public.weigh_ins;

CREATE POLICY "weigh_ins_select_own" ON public.weigh_ins
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "weigh_ins_insert_own" ON public.weigh_ins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weigh_ins_update_own" ON public.weigh_ins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weigh_ins_delete_own" ON public.weigh_ins
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 5. PROFILES: COMPLETE RLS POLICIES
-- ============================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles
  FOR DELETE
  USING (auth.uid() = id);

-- ============================================
-- 6. DEFENSE-IN-DEPTH: AUTO-SET USER_ID TRIGGERS
-- ============================================
-- Even if client sends wrong user_id, server overwrites it

-- Trigger function to enforce user_id = auth.uid()
CREATE OR REPLACE FUNCTION public.enforce_user_id_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Always set user_id to the authenticated user
  NEW.user_id := auth.uid();

  -- Prevent NULL user_id (should never happen with auth, but safety check)
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be NULL - authentication required';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to ai_messages (idempotent)
DROP TRIGGER IF EXISTS enforce_ai_messages_user_id ON public.ai_messages;
CREATE TRIGGER enforce_ai_messages_user_id
  BEFORE INSERT OR UPDATE ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_id_from_auth();

-- Apply trigger to meals (idempotent)
DROP TRIGGER IF EXISTS enforce_meals_user_id ON public.meals;
CREATE TRIGGER enforce_meals_user_id
  BEFORE INSERT OR UPDATE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_id_from_auth();

-- Apply trigger to weigh_ins (idempotent)
DROP TRIGGER IF EXISTS enforce_weigh_ins_user_id ON public.weigh_ins;
CREATE TRIGGER enforce_weigh_ins_user_id
  BEFORE INSERT OR UPDATE ON public.weigh_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_user_id_from_auth();

-- ============================================
-- 7. REALTIME: REPLICA IDENTITY & PUBLICATION
-- ============================================

-- Set REPLICA IDENTITY to FULL for realtime updates
ALTER TABLE public.ai_messages REPLICA IDENTITY FULL;
ALTER TABLE public.meals REPLICA IDENTITY FULL;
ALTER TABLE public.weigh_ins REPLICA IDENTITY FULL;

-- Remove from publication first (idempotent - ignore errors)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.ai_messages;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.meals;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.weigh_ins;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.meals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weigh_ins;

-- Force cache reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- ============================================
-- 8. DIAGNOSTIC VIEWS FOR /api/debug/rls
-- ============================================

-- View: RLS status for ai_messages
-- Always drop the view first to avoid column rename issues
DROP VIEW IF EXISTS public.v_ai_messages_rls_status;
CREATE VIEW public.v_ai_messages_rls_status AS
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'ai_messages';

-- View: All policies for ai_messages
-- Always drop the view first to avoid column rename issues
DROP VIEW IF EXISTS public.v_ai_messages_policies;
CREATE VIEW public.v_ai_messages_policies AS
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'ai_messages'
ORDER BY cmd, policyname;

-- Function: Test impersonation (count only, for diagnostics)
CREATE OR REPLACE FUNCTION public.debug_ai_messages_impersonation(_user_id UUID)
RETURNS TABLE(seen_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)
  FROM public.ai_messages
  WHERE user_id = _user_id;
END;
$$;

-- Grant permissions for diagnostic views/functions
GRANT SELECT ON public.v_ai_messages_rls_status TO authenticated;
GRANT SELECT ON public.v_ai_messages_policies TO authenticated;
GRANT EXECUTE ON FUNCTION public.debug_ai_messages_impersonation TO authenticated;

-- ============================================
-- 9. SUMMARY
-- ============================================
-- ✓ RLS enabled on ai_messages, meals, weigh_ins, profiles
-- ✓ 4 policies per table (SELECT/INSERT/UPDATE/DELETE)
-- ✓ Defense-in-depth triggers auto-set user_id = auth.uid()
-- ✓ Replica identity FULL for realtime
-- ✓ Tables added to supabase_realtime publication
-- ✓ Cache reloaded with NOTIFY
-- ✓ Diagnostic views/functions created

-- Run verification:
-- SELECT * FROM v_ai_messages_rls_status;  -- Should show rls_enabled = true
-- SELECT * FROM v_ai_messages_policies;    -- Should show 4 policies
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';  -- Should include ai_messages
