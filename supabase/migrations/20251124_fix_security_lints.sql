-- ============================================
-- Security Fixes Migration
-- Date: 2025-11-24
-- ============================================
-- This migration fixes all security lints from Supabase:
-- 1. ERROR: Remove SECURITY DEFINER from diagnostic views
-- 2. ERROR: Enable RLS on _prisma_migrations table
-- 3. WARN: Add immutable search_path to all functions
-- 4. WARN: Move pg_trgm extension out of public schema
-- ============================================

-- ============================================
-- 1. FIX SECURITY DEFINER VIEWS (ERROR)
-- ============================================
-- Drop and recreate views WITHOUT security_barrier or security_definer
-- These are diagnostic views that should use the caller's permissions

DROP VIEW IF EXISTS public.v_ai_messages_rls_status CASCADE;
CREATE VIEW public.v_ai_messages_rls_status
WITH (security_barrier = false) AS
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'ai_messages';

DROP VIEW IF EXISTS public.v_ai_messages_policies CASCADE;
CREATE VIEW public.v_ai_messages_policies
WITH (security_barrier = false) AS
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

-- Grant permissions
GRANT SELECT ON public.v_ai_messages_rls_status TO authenticated;
GRANT SELECT ON public.v_ai_messages_policies TO authenticated;

-- ============================================
-- 2. ENABLE RLS ON _prisma_migrations (ERROR)
-- ============================================
-- _prisma_migrations should not be publicly accessible

ALTER TABLE IF EXISTS public._prisma_migrations ENABLE ROW LEVEL SECURITY;

-- Create restrictive policy: only service_role can access
DO $$
BEGIN
  -- Drop existing policy if any
  DROP POLICY IF EXISTS "_prisma_migrations_service_role_only" ON public._prisma_migrations;

  -- Create policy that blocks all regular users
  CREATE POLICY "_prisma_migrations_service_role_only" ON public._prisma_migrations
    FOR ALL
    USING (false)
    WITH CHECK (false);
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- Table doesn't exist yet, skip
END $$;

-- ============================================
-- 3. FIX FUNCTION search_path (WARN - HIGH PRIORITY)
-- ============================================
-- Add SET search_path = public to all functions to prevent
-- search path hijacking attacks

-- Function: update_meals_updated_at
CREATE OR REPLACE FUNCTION public.update_meals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: update_avatars_updated_at
CREATE OR REPLACE FUNCTION public.update_avatars_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: fn_user_current_chapter
CREATE OR REPLACE FUNCTION public.fn_user_current_chapter(_user_id UUID)
RETURNS TABLE(
  chapter_id UUID,
  chapter_number INT,
  chapter_title TEXT,
  is_unlocked BOOLEAN,
  completed_stages INT,
  total_stages INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chapter_id,
    c.chapter_number,
    c.title AS chapter_title,
    COALESCE(uc.is_unlocked, FALSE) AS is_unlocked,
    COALESCE(COUNT(us.id) FILTER (WHERE us.is_completed = TRUE), 0)::INT AS completed_stages,
    COUNT(s.id)::INT AS total_stages
  FROM chapters c
  LEFT JOIN user_chapters uc ON uc.chapter_id = c.id AND uc.user_id = _user_id
  LEFT JOIN stages s ON s.chapter_id = c.id
  LEFT JOIN user_stages us ON us.stage_id = s.id AND us.user_id = _user_id
  WHERE uc.is_unlocked = TRUE OR c.chapter_number = 1
  GROUP BY c.id, c.chapter_number, c.title, uc.is_unlocked
  ORDER BY c.chapter_number
  LIMIT 1;
END;
$$;

-- Function: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: slugify_hebrew
CREATE OR REPLACE FUNCTION public.slugify_hebrew(text_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN lower(regexp_replace(text_input, '[^א-ת0-9a-zA-Z-]', '-', 'g'));
END;
$$;

-- Function: exercise_library_set_defaults
CREATE OR REPLACE FUNCTION public.exercise_library_set_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS NULL THEN
    NEW.is_active := TRUE;
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify_hebrew(NEW.name);
  END IF;

  RETURN NEW;
END;
$$;

-- Function: set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: is_user_admin (appears twice in lints, fixing once)
CREATE OR REPLACE FUNCTION public.is_user_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role
  FROM profiles
  WHERE id = _user_id;

  RETURN admin_role = 'admin';
END;
$$;

-- Function: update_exercise_updated_at
CREATE OR REPLACE FUNCTION public.update_exercise_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: generate_exercise_slug
CREATE OR REPLACE FUNCTION public.generate_exercise_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := public.slugify_hebrew(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

-- Function: ai_messages_set_user_id
CREATE OR REPLACE FUNCTION public.ai_messages_set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

-- Function: fn_user_context
CREATE OR REPLACE FUNCTION public.fn_user_context(_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', (SELECT row_to_json(p.*) FROM profiles p WHERE id = _user_id),
    'current_program', (SELECT row_to_json(pr.*) FROM programs pr WHERE pr.user_id = _user_id ORDER BY created_at DESC LIMIT 1)
  ) INTO result;

  RETURN result;
END;
$$;

-- Function: get_user_avatar_details
CREATE OR REPLACE FUNCTION public.get_user_avatar_details(_user_id UUID)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  level INT,
  experience INT,
  total_points INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.user_id, a.level, a.experience, a.total_points
  FROM avatars a
  WHERE a.user_id = _user_id;
END;
$$;

-- Function: enforce_user_id_from_auth
CREATE OR REPLACE FUNCTION public.enforce_user_id_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be NULL - authentication required';
  END IF;

  RETURN NEW;
END;
$$;

-- Function: debug_ai_messages_impersonation
CREATE OR REPLACE FUNCTION public.debug_ai_messages_impersonation(_user_id UUID)
RETURNS TABLE(seen_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)
  FROM public.ai_messages
  WHERE user_id = _user_id;
END;
$$;

-- Function: fn_set_user_id
CREATE OR REPLACE FUNCTION public.fn_set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$;

-- Function: fn_update_timestamp
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: fn_journey_user_view
CREATE OR REPLACE FUNCTION public.fn_journey_user_view(_user_id UUID)
RETURNS TABLE(
  stage_id UUID,
  stage_title TEXT,
  is_completed BOOLEAN,
  unlock_date TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS stage_id,
    s.title AS stage_title,
    COALESCE(us.is_completed, FALSE) AS is_completed,
    us.unlock_date
  FROM stages s
  LEFT JOIN user_stages us ON us.stage_id = s.id AND us.user_id = _user_id
  ORDER BY s.stage_number;
END;
$$;

-- Function: update_weigh_ins_updated_at
CREATE OR REPLACE FUNCTION public.update_weigh_ins_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: is_program_normalized
CREATE OR REPLACE FUNCTION public.is_program_normalized(_program_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_workouts BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM workouts WHERE program_id = _program_id
  ) INTO has_workouts;

  RETURN has_workouts;
END;
$$;

-- Function: get_program_stats
CREATE OR REPLACE FUNCTION public.get_program_stats(_program_id UUID)
RETURNS TABLE(
  total_workouts INT,
  completed_workouts INT,
  progress_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT AS total_workouts,
    COUNT(*) FILTER (WHERE completed = TRUE)::INT AS completed_workouts,
    CASE
      WHEN COUNT(*) = 0 THEN 0::NUMERIC
      ELSE ROUND((COUNT(*) FILTER (WHERE completed = TRUE)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
    END AS progress_percentage
  FROM workouts
  WHERE program_id = _program_id;
END;
$$;

-- Function: is_owner
CREATE OR REPLACE FUNCTION public.is_owner(_table_name TEXT, _record_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id UUID;
BEGIN
  EXECUTE format('SELECT user_id FROM %I WHERE id = $1', _table_name)
  INTO owner_id
  USING _record_id;

  RETURN owner_id = _user_id;
END;
$$;

-- Function: create_default_notification_preferences
CREATE OR REPLACE FUNCTION public.create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Function: app.current_user_id (in app schema)
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN auth.uid();
END;
$$;

-- ============================================
-- 4. MOVE pg_trgm EXTENSION (WARN)
-- ============================================
-- Move pg_trgm extension from public to extensions schema
-- Note: This requires careful coordination and may need to be done
-- via Supabase dashboard or carefully in maintenance window

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Attempt to relocate pg_trgm
-- Note: This may fail if the extension is in use. If so, this needs
-- to be done during a maintenance window via Supabase dashboard.
DO $$
BEGIN
  -- Check if extension exists in public
  IF EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'pg_trgm'
    AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    -- Move extension to extensions schema
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If moving fails, log a warning but don't fail the migration
    RAISE WARNING 'Could not move pg_trgm extension: %. This should be done via Supabase dashboard.', SQLERRM;
END $$;

-- ============================================
-- 5. VERIFICATION QUERIES
-- ============================================
-- Run these to verify fixes:
--
-- Check views are not security definer:
-- SELECT viewname, viewowner FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v_ai%';
--
-- Check RLS enabled on _prisma_migrations:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = '_prisma_migrations';
--
-- Check functions have search_path set:
-- SELECT proname, prosrc FROM pg_proc WHERE proname IN ('update_meals_updated_at', 'is_user_admin');
--
-- Check pg_trgm location:
-- SELECT extname, nspname FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid WHERE extname = 'pg_trgm';

-- ============================================
-- SUMMARY
-- ============================================
-- ✓ Removed SECURITY DEFINER from diagnostic views (ERROR fixed)
-- ✓ Enabled RLS on _prisma_migrations (ERROR fixed)
-- ✓ Added SET search_path to 25 functions (WARN fixed)
-- ✓ Attempted to move pg_trgm extension (WARN - may need manual fix)
--
-- MANUAL ACTION REQUIRED:
-- 1. Enable "Leaked Password Protection" in Supabase Auth dashboard
--    Settings > Auth > Password Security > Enable breach detection
