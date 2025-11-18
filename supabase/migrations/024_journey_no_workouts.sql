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
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_stage_tasks')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stage_task_templates') THEN
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
    RAISE NOTICE 'Removed user progress for non-nutrition/habit tasks';
  ELSE
    RAISE NOTICE 'Tables user_stage_tasks or stage_task_templates do not exist - skipping deletion';
  END IF;
END $$;

-- Remove workout task templates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stage_task_templates') THEN
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
    RAISE NOTICE 'Removed workout task templates';
  ELSE
    RAISE NOTICE 'Table stage_task_templates does not exist - skipping deletion';
  END IF;
END $$;

-- ============================================================================
-- 2. Add Database Constraint
-- ============================================================================

-- Drop existing constraint if it exists and add new constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stage_task_templates') THEN
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

    RAISE NOTICE 'Added task_type_allowed constraint';
  ELSE
    RAISE NOTICE 'Table stage_task_templates does not exist - skipping constraint';
  END IF;
END $$;

-- ============================================================================
-- 3. Ensure Realtime for Journey Tables
-- ============================================================================

-- Enable realtime for user_progress and user_stage_tasks tables if they exist
DO $$
BEGIN
  -- Check if publication exists and add tables if needed
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Add user_progress to realtime publication if table exists and not already in publication
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_progress')
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_progress') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
      RAISE NOTICE 'Added user_progress to supabase_realtime publication';
    ELSE
      RAISE NOTICE 'user_progress already in supabase_realtime publication or table does not exist';
    END IF;

    -- Add user_stage_tasks to realtime publication if table exists and not already in publication
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_stage_tasks')
       AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_stage_tasks') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stage_tasks;
      RAISE NOTICE 'Added user_stage_tasks to supabase_realtime publication';
    ELSE
      RAISE NOTICE 'user_stage_tasks already in supabase_realtime publication or table does not exist';
    END IF;
  ELSE
    RAISE NOTICE 'supabase_realtime publication does not exist - skipping';
  END IF;
END $$;

-- ============================================================================
-- 4. Add Indexes for Performance
-- ============================================================================

-- Index for querying tasks by type (for validation)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stage_task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stage_task_templates' AND column_name = 'type') THEN
    CREATE INDEX IF NOT EXISTS idx_stage_task_templates_type
    ON stage_task_templates(type);
    RAISE NOTICE 'Created index idx_stage_task_templates_type';
  ELSE
    RAISE NOTICE 'Table stage_task_templates or column type does not exist - skipping index';
  END IF;
END $$;

-- Indexes for user task queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_stage_tasks') THEN
    -- Only create user_id index if the column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_stage_tasks' AND column_name = 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_user_id
      ON user_stage_tasks(user_id);
      RAISE NOTICE 'Created index idx_user_stage_tasks_user_id';
    ELSE
      RAISE NOTICE 'Column user_id does not exist in user_stage_tasks - skipping index';
    END IF;

    -- Only create completed_at index if both columns exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_stage_tasks' AND column_name = 'user_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_stage_tasks' AND column_name = 'completed_at') THEN
      CREATE INDEX IF NOT EXISTS idx_user_stage_tasks_completed
      ON user_stage_tasks(user_id, completed_at)
      WHERE completed_at IS NOT NULL;
      RAISE NOTICE 'Created index idx_user_stage_tasks_completed';
    ELSE
      RAISE NOTICE 'Columns user_id or completed_at do not exist in user_stage_tasks - skipping index';
    END IF;
  ELSE
    RAISE NOTICE 'Table user_stage_tasks does not exist - skipping indexes';
  END IF;
END $$;

-- ============================================================================
-- 5. Verify Data Integrity
-- ============================================================================

-- Count of tasks by type (for logging/verification)
DO $$
DECLARE
  task_counts TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stage_task_templates') THEN
    SELECT string_agg(type || ': ' || count::text, ', ')
    INTO task_counts
    FROM (
      SELECT type, COUNT(*) as count
      FROM stage_task_templates
      GROUP BY type
      ORDER BY type
    ) t;

    RAISE NOTICE 'Task counts by type: %', COALESCE(task_counts, 'No tasks found');
  ELSE
    RAISE NOTICE 'Table stage_task_templates does not exist - skipping verification';
  END IF;
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
