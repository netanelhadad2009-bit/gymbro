-- ============================================================================
-- Migration 024: Journey System - Remove Workout Tasks
-- ============================================================================
-- Description: Enforce nutrition/habit-only tasks in the Journey system.
--              Remove any legacy workout-related tasks and add database constraints.
-- Created: 2025-10-30
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Remove Legacy Workout Tasks
-- ============================================================================

-- Remove user progress for workout tasks (if they exist)
DELETE FROM user_stage_tasks
WHERE task_template_id IN (
  SELECT id FROM stage_task_templates
  WHERE type NOT IN (
    'meal_log',
    'protein_target',
    'calorie_window',
    'weigh_in',
    'streak_days',
    'habit_check',
    'edu_read'
  )
);

-- Remove workout task templates
DELETE FROM stage_task_templates
WHERE type NOT IN (
  'meal_log',
  'protein_target',
  'calorie_window',
  'weigh_in',
  'streak_days',
  'habit_check',
  'edu_read'
);

-- ============================================================================
-- 2. Add Database Constraint
-- ============================================================================

-- Drop existing constraint if it exists
ALTER TABLE stage_task_templates
DROP CONSTRAINT IF EXISTS task_type_allowed;

-- Add new constraint to enforce only allowed task types
ALTER TABLE stage_task_templates
ADD CONSTRAINT task_type_allowed CHECK (
  type IN (
    'meal_log',
    'protein_target',
    'calorie_window',
    'weigh_in',
    'streak_days',
    'habit_check',
    'edu_read'
  )
);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT task_type_allowed ON stage_task_templates IS
'Journey system only supports nutrition and habit tasks. NO workout tasks allowed. Types: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read';

-- ============================================================================
-- 3. Ensure Realtime for Journey Tables
-- ============================================================================

-- Enable realtime for user_progress table if not already enabled
DO $$
BEGIN
  -- Check if publication exists and add tables if needed
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Add user_progress to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.user_progress;

    -- Add user_stage_tasks to realtime publication
    ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.user_stage_tasks;

    RAISE NOTICE 'Added journey tables to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'supabase_realtime publication does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- 4. Add Indexes for Performance
-- ============================================================================

-- Index for querying tasks by type (for validation)
CREATE INDEX IF NOT EXISTS idx_stage_task_templates_type
ON stage_task_templates(type);

-- Index for user task queries
CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_user_id
ON user_stage_tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_completed
ON user_stage_tasks(user_id, completed_at)
WHERE completed_at IS NOT NULL;

-- ============================================================================
-- 5. Verify Data Integrity
-- ============================================================================

-- Count of tasks by type (for logging/verification)
DO $$
DECLARE
  task_counts TEXT;
BEGIN
  SELECT string_agg(type || ': ' || count::text, ', ')
  INTO task_counts
  FROM (
    SELECT type, COUNT(*) as count
    FROM stage_task_templates
    GROUP BY type
    ORDER BY type
  ) t;

  RAISE NOTICE 'Task counts by type: %', COALESCE(task_counts, 'No tasks found');
END $$;

COMMIT;

-- ============================================================================
-- Verification Queries (Run these after migration to verify)
-- ============================================================================

-- Check for any invalid task types (should return 0 rows)
-- SELECT * FROM stage_task_templates
-- WHERE type NOT IN ('meal_log','protein_target','calorie_window','weigh_in','streak_days','habit_check','edu_read');

-- View task distribution by type
-- SELECT type, COUNT(*) as count FROM stage_task_templates GROUP BY type ORDER BY count DESC;

-- Check realtime status
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename IN ('user_progress', 'user_stage_tasks');
