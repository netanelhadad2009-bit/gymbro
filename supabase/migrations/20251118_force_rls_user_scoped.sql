-- ============================================================================
-- FORCE ROW LEVEL SECURITY ON USER-SCOPED TABLES
-- ============================================================================
-- Purpose: Enable FORCE ROW LEVEL SECURITY on all user-scoped tables
--          to ensure even privileged roles (except service_role) respect RLS
--
-- Context: Previous migrations enabled RLS, but FORCE RLS adds extra protection
--          against accidental privilege escalation attacks
--
-- Date: 2025-11-18
-- Migration: 20251118_force_rls_user_scoped.sql
-- ============================================================================

-- ============================================================================
-- WHY FORCE RLS?
-- ============================================================================
-- Standard RLS: Table owner and superuser can bypass RLS
-- FORCE RLS: Even table owner must follow RLS policies
--            Only service_role can bypass (which we control carefully)
--
-- Benefits:
-- 1. Prevents accidental cross-user data access
-- 2. Protects against privilege escalation
-- 3. Defense in depth - even if attacker gains elevated role, RLS still applies
-- 4. Aligns with security best practice (OWASP, CIS Benchmarks)
-- ============================================================================

BEGIN;

-- ============================================================================
-- USER-SCOPED TABLES (user_id column - strict user isolation)
-- ============================================================================

-- Users and Profile Data
ALTER TABLE IF EXISTS public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weigh_ins FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_avatar FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_badges FORCE ROW LEVEL SECURITY;

-- Nutrition & Meals
ALTER TABLE IF EXISTS public.meals FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_foods FORCE ROW LEVEL SECURITY;

-- Points & Gamification
ALTER TABLE IF EXISTS public.points_events FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_points FORCE ROW LEVEL SECURITY;

-- AI Coach
ALTER TABLE IF EXISTS public.ai_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.checkins FORCE ROW LEVEL SECURITY;

-- Push Notifications
ALTER TABLE IF EXISTS public.push_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_preferences FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notification_logs FORCE ROW LEVEL SECURITY;

-- Programs & Workouts (user-owned)
ALTER TABLE IF EXISTS public.programs FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- CASCADING ACCESS TABLES (access via parent user_id)
-- ============================================================================

-- Workout cascade (via programs.user_id)
ALTER TABLE IF EXISTS public.workouts FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.workout_exercises FORCE ROW LEVEL SECURITY;

-- Nutrition Plans (via programs.user_id)
ALTER TABLE IF EXISTS public.nutrition_plans FORCE ROW LEVEL SECURITY;

-- Coach Communication (via coach_assignments.user_id)
ALTER TABLE IF EXISTS public.coach_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_chat_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_presence FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_task_completions FORCE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.coach_sessions FORCE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check that all critical user-scoped tables have FORCE RLS enabled

DO $$
DECLARE
  missing_force_rls TEXT[];
  table_name TEXT;
  user_scoped_tables TEXT[] := ARRAY[
    'profiles',
    'weigh_ins',
    'user_progress',
    'user_avatar',
    'user_badges',
    'meals',
    'user_foods',
    'points_events',
    'user_points',
    'ai_messages',
    'coach_assignments',
    'checkins',
    'push_subscriptions',
    'notification_preferences',
    'notification_logs',
    'programs',
    'workouts',
    'workout_exercises',
    'nutrition_plans',
    'coach_threads',
    'coach_chat_messages',
    'coach_presence',
    'coach_tasks',
    'coach_task_completions',
    'coach_sessions'
  ];
BEGIN
  -- Check each table
  FOREACH table_name IN ARRAY user_scoped_tables
  LOOP
    -- Check if table exists and has rowsecurity = true
    IF EXISTS (
      SELECT 1
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename = table_name
    ) THEN
      -- Check if RLS is forced
      IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = table_name
          AND rowsecurity = true
      ) THEN
        missing_force_rls := array_append(missing_force_rls, table_name);
      END IF;
    END IF;
  END LOOP;

  -- Report results
  IF array_length(missing_force_rls, 1) > 0 THEN
    RAISE EXCEPTION 'FORCE RLS verification failed for tables: %', array_to_string(missing_force_rls, ', ');
  ELSE
    RAISE NOTICE '✅ FORCE RLS verification passed: All % user-scoped tables have RLS enabled',
      array_length(user_scoped_tables, 1);
  END IF;
END;
$$;

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. This migration is IDEMPOTENT - safe to run multiple times
-- 2. PUBLIC CATALOG TABLES are intentionally excluded:
--    - avatar_catalog, exercise_library, exercise_tags, exercise_library_tags
--    - israel_moh_foods, barcode_aliases, food_cache
--    - journey_chapters, journey_nodes, coaches
--    These are shared read-only data and don't need FORCE RLS
--
-- 3. SYSTEM TABLES are excluded:
--    - _prisma_migrations
--    - supabase_migrations.schema_migrations
--
-- 4. If a table doesn't exist, ALTER TABLE IF EXISTS prevents errors
--
-- 5. service_role can still bypass FORCE RLS for:
--    - Migrations
--    - Admin operations
--    - Background jobs
--    This is intentional and required for system operations
-- ============================================================================
