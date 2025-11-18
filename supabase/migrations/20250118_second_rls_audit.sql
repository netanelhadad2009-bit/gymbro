-- ==================================================================================
-- Second-Pass RLS Security Audit & Hardening
-- Generated: 2025-01-18
--
-- CRITICAL FIXES:
-- 1. Remove profiles data leak (profiles_read_auth policy)
-- 2. Enable RLS on journey tables
-- 3. Clean up duplicate policies
--
-- This migration is IDEMPOTENT and safe to run multiple times.
-- ==================================================================================

-- ==================================================================================
-- CRITICAL FIX #1: Remove profiles data leak
-- ==================================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_read_auth'
  ) THEN
    DROP POLICY "profiles_read_auth" ON public.profiles;
    RAISE NOTICE 'Dropped dangerous policy: profiles_read_auth';
  END IF;
END
$$;

-- ==================================================================================
-- FIX #2: Enable RLS on journey catalog tables
-- ==================================================================================

ALTER TABLE public.journey_chapters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'journey_chapters'
      AND policyname = 'Authenticated users can read journey_chapters'
  ) THEN
    CREATE POLICY "Authenticated users can read journey_chapters" ON public.journey_chapters
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'journey_chapters'
      AND policyname = 'Admins can manage journey_chapters'
  ) THEN
    CREATE POLICY "Admins can manage journey_chapters" ON public.journey_chapters
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_admin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_admin = true
        )
      );
  END IF;
END
$$;

ALTER TABLE public.journey_nodes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'journey_nodes'
      AND policyname = 'Authenticated users can read journey_nodes'
  ) THEN
    CREATE POLICY "Authenticated users can read journey_nodes" ON public.journey_nodes
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'journey_nodes'
      AND policyname = 'Admins can manage journey_nodes'
  ) THEN
    CREATE POLICY "Admins can manage journey_nodes" ON public.journey_nodes
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_admin = true
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid() AND p.is_admin = true
        )
      );
  END IF;
END
$$;

-- ==================================================================================
-- FIX #3: Clean up duplicate policies
-- ==================================================================================

-- ai_messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_delete_own') THEN DROP POLICY "ai_messages_delete_own" ON public.ai_messages; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_insert_own') THEN DROP POLICY "ai_messages_insert_own" ON public.ai_messages; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_insert_self') THEN DROP POLICY "ai_messages_insert_self" ON public.ai_messages; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_select_own') THEN DROP POLICY "ai_messages_select_own" ON public.ai_messages; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_messages' AND policyname='ai_messages_update_own') THEN DROP POLICY "ai_messages_update_own" ON public.ai_messages; END IF;
END
$$;

-- meals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meals' AND policyname='meals_delete_own') THEN DROP POLICY "meals_delete_own" ON public.meals; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meals' AND policyname='meals_insert_own') THEN DROP POLICY "meals_insert_own" ON public.meals; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meals' AND policyname='meals_select_own') THEN DROP POLICY "meals_select_own" ON public.meals; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='meals' AND policyname='meals_update_own') THEN DROP POLICY "meals_update_own" ON public.meals; END IF;
END
$$;

-- notification_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_logs' AND policyname='Service role can manage logs') THEN DROP POLICY "Service role can manage logs" ON public.notification_logs; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='notification_logs' AND policyname='Users can view own notification logs') THEN DROP POLICY "Users can view own notification logs" ON public.notification_logs; END IF;
END
$$;

-- user_avatar
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_avatar' AND policyname='Service role can manage avatars') THEN DROP POLICY "Service role can manage avatars" ON public.user_avatar; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_avatar' AND policyname='Users can read own avatar') THEN DROP POLICY "Users can read own avatar" ON public.user_avatar; END IF;
END
$$;

-- user_badges
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_badges' AND policyname='user_badges_delete') THEN DROP POLICY "user_badges_delete" ON public.user_badges; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_badges' AND policyname='user_badges_insert') THEN DROP POLICY "user_badges_insert" ON public.user_badges; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_badges' AND policyname='user_badges_select') THEN DROP POLICY "user_badges_select" ON public.user_badges; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='user_badges' AND policyname='user_badges_update') THEN DROP POLICY "user_badges_update" ON public.user_badges; END IF;
END
$$;

-- points_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='points_events' AND policyname='Users can insert own points') THEN DROP POLICY "Users can insert own points" ON public.points_events; END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='points_events' AND policyname='Users can view own points') THEN DROP POLICY "Users can view own points" ON public.points_events; END IF;
END
$$;

-- exercise catalog tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exercise_library' AND policyname='read_exercise_library') THEN DROP POLICY "read_exercise_library" ON public.exercise_library; END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exercise_library_tags' AND policyname='read_exercise_library_tags') THEN DROP POLICY "read_exercise_library_tags" ON public.exercise_library_tags; END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='exercise_tags' AND policyname='read_exercise_tags') THEN DROP POLICY "read_exercise_tags" ON public.exercise_tags; END IF;
END
$$;

-- ==================================================================================
-- VERIFICATION & AUDIT LOG
-- ==================================================================================

DO $$
DECLARE dangerous_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dangerous_count
  FROM pg_policies
  WHERE schemaname='public'
    AND tablename='profiles'
    AND policyname='profiles_read_auth';

  IF dangerous_count > 0 THEN
    RAISE EXCEPTION 'CRITICAL: profiles_read_auth policy still exists!';
  ELSE
    RAISE NOTICE '✅ Verified: profiles_read_auth policy removed';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t
    WHERE t.schemaname='public'
      AND t.tablename='journey_chapters'
      AND t.rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'journey_chapters does not have RLS enabled';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t
    WHERE t.schemaname='public'
      AND t.tablename='journey_nodes'
      AND t.rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'journey_nodes does not have RLS enabled';
  END IF;

  RAISE NOTICE '✅ Verified: journey tables have RLS enabled';
END
$$;
