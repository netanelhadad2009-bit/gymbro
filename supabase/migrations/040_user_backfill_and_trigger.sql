-- ============================================
-- User Backfill and Auto-Creation Trigger
-- Date: 2025-11-25
-- ============================================
-- This migration:
-- 1. Creates a trigger function to auto-create public."User" rows when new auth users sign up
-- 2. Backfills existing auth.users that don't have matching public."User" rows
-- ============================================

-- ============================================
-- 1. CREATE FUNCTION: handle_new_auth_user
-- ============================================
-- This function is called by a trigger whenever a new user is created in auth.users.
-- It creates a corresponding row in public."User" with:
--   - id: 'user_' + auth_user_id (TEXT, matches existing schema)
--   - email: from auth.users
--   - authUserId: the auth.users.id
-- Uses ON CONFLICT to be idempotent (safe to run multiple times).

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public."User" (
    "id",
    "email",
    "authUserId",
    "createdAt"
  )
  VALUES (
    'user_' || NEW.id::text,
    COALESCE(NEW.email, ''),
    NEW.id::text,
    NOW()
  )
  ON CONFLICT ("authUserId") DO NOTHING;

  RETURN NEW;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.handle_new_auth_user() IS
  'Automatically creates a public."User" row when a new auth user signs up. Idempotent via ON CONFLICT.';

-- ============================================
-- 2. CREATE TRIGGER: on_auth_user_created
-- ============================================
-- Drop existing trigger first (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to fire after new auth user is inserted
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================
-- 3. BACKFILL: Create public."User" rows for existing auth users
-- ============================================
-- This INSERT creates rows for all auth.users that don't already have
-- a matching row in public."User" (by authUserId).
-- Safe to run multiple times due to ON CONFLICT DO NOTHING.

INSERT INTO public."User" (
  "id",
  "email",
  "authUserId",
  "createdAt"
)
SELECT
  'user_' || au.id::text AS "id",
  COALESCE(au.email, '') AS "email",
  au.id::text AS "authUserId",
  COALESCE(au.created_at, NOW()) AS "createdAt"
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public."User" u WHERE u."authUserId" = au.id::text
)
ON CONFLICT ("authUserId") DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================
-- Run these in Supabase SQL Editor to verify:
--
-- 1. Check all auth users have corresponding public."User" rows:
--    SELECT
--      au.id AS auth_id,
--      au.email AS auth_email,
--      u.id AS user_id,
--      u."authUserId"
--    FROM auth.users au
--    LEFT JOIN public."User" u ON u."authUserId" = au.id::text
--    ORDER BY au.created_at DESC;
--
-- 2. Count comparison (should be equal):
--    SELECT
--      (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
--      (SELECT COUNT(*) FROM public."User") AS public_users_count;
--
-- 3. Find any auth users missing from public."User" (should return 0 rows):
--    SELECT au.id, au.email
--    FROM auth.users au
--    WHERE NOT EXISTS (
--      SELECT 1 FROM public."User" u WHERE u."authUserId" = au.id::text
--    );
-- ============================================
