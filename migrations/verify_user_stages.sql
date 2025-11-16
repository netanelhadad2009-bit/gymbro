-- ============================================
-- User Stages System - Verification Queries
-- ============================================
-- Run these queries in Supabase SQL Editor to verify the stages system

-- 1. Check if tables exist and RLS is enabled
SELECT
  table_name,
  (SELECT relrowsecurity FROM pg_class WHERE relname = table_name) as rls_enabled
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_stages', 'user_stage_tasks')
ORDER BY table_name;

-- 2. Check RLS policies
SELECT
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_stages', 'user_stage_tasks')
ORDER BY tablename, policyname;

-- 3. View all user stages (sorted by creation date)
SELECT
  id,
  user_id,
  stage_index,
  code,
  title_he,
  is_unlocked,
  is_completed,
  created_at
FROM user_stages
ORDER BY created_at DESC, stage_index ASC
LIMIT 20;

-- 4. View stages with task count
SELECT
  s.user_id,
  s.stage_index,
  s.code,
  s.title_he,
  s.is_unlocked,
  s.is_completed,
  COUNT(t.id) as task_count,
  s.created_at
FROM user_stages s
LEFT JOIN user_stage_tasks t ON t.user_stage_id = s.id
GROUP BY s.id, s.user_id, s.stage_index, s.code, s.title_he, s.is_unlocked, s.is_completed, s.created_at
ORDER BY s.created_at DESC, s.stage_index ASC
LIMIT 20;

-- 5. Check stages for a specific user (replace USER_ID_HERE with actual UUID)
-- SELECT
--   s.stage_index,
--   s.code,
--   s.title_he,
--   s.is_unlocked,
--   s.is_completed,
--   COUNT(t.id) as total_tasks,
--   SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END) as completed_tasks
-- FROM user_stages s
-- LEFT JOIN user_stage_tasks t ON t.user_stage_id = s.id
-- WHERE s.user_id = 'USER_ID_HERE'
-- GROUP BY s.id, s.stage_index, s.code, s.title_he, s.is_unlocked, s.is_completed
-- ORDER BY s.stage_index;

-- 6. Find users without stages (for debugging)
SELECT
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  COUNT(s.id) as stage_count
FROM auth.users u
LEFT JOIN user_stages s ON s.user_id = u.id
WHERE u.created_at > NOW() - INTERVAL '7 days'  -- Only recent users
GROUP BY u.id, u.email, u.created_at
HAVING COUNT(s.id) = 0
ORDER BY u.created_at DESC
LIMIT 10;

-- 7. View all tasks for debugging
SELECT
  s.user_id,
  s.stage_index,
  s.code as stage_code,
  t.order_index,
  t.key_code,
  t.title_he,
  t.is_completed,
  t.created_at
FROM user_stage_tasks t
JOIN user_stages s ON s.id = t.user_stage_id
ORDER BY s.created_at DESC, s.stage_index, t.order_index
LIMIT 50;

-- 8. Check active stages (unlocked but not completed)
SELECT
  s.user_id,
  s.stage_index,
  s.code,
  s.title_he,
  COUNT(t.id) as total_tasks,
  SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END) as completed_tasks,
  ROUND(100.0 * SUM(CASE WHEN t.is_completed THEN 1 ELSE 0 END) / COUNT(t.id), 1) as progress_pct
FROM user_stages s
LEFT JOIN user_stage_tasks t ON t.user_stage_id = s.id
WHERE s.is_unlocked = true AND s.is_completed = false
GROUP BY s.id, s.user_id, s.stage_index, s.code, s.title_he
ORDER BY s.created_at DESC
LIMIT 20;

-- 9. Verify indexes exist
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('user_stages', 'user_stage_tasks')
ORDER BY tablename, indexname;

-- 10. Check for orphaned tasks (tasks without a valid stage)
SELECT
  t.id,
  t.user_stage_id,
  t.key_code,
  t.created_at
FROM user_stage_tasks t
LEFT JOIN user_stages s ON s.id = t.user_stage_id
WHERE s.id IS NULL
LIMIT 10;
