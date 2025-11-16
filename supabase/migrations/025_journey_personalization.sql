-- ============================================================================
-- Migration 025: Journey Personalization Support
-- ============================================================================
-- Description: Add columns to support avatar-based personalized journey plans
-- Created: 2025-11-01
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add Metadata and Personalization Columns to journey_chapters
-- ============================================================================

-- Add metadata column for storing avatar_key, source, etc.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_chapters'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.journey_chapters
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb NOT NULL;
    RAISE NOTICE 'Added metadata column to journey_chapters';
  END IF;
END $$;

-- Add subtitle column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_chapters'
      AND column_name = 'subtitle'
  ) THEN
    ALTER TABLE public.journey_chapters
    ADD COLUMN subtitle text;
    RAISE NOTICE 'Added subtitle column to journey_chapters';
  END IF;
END $$;

-- Add description column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_chapters'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.journey_chapters
    ADD COLUMN description text;
    RAISE NOTICE 'Added description column to journey_chapters';
  END IF;
END $$;

-- ============================================================================
-- 2. Add Missing Columns to journey_nodes
-- ============================================================================

-- Add type column for task type (meal_log, protein_target, etc.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_nodes'
      AND column_name = 'type'
  ) THEN
    ALTER TABLE public.journey_nodes
    ADD COLUMN type text;
    RAISE NOTICE 'Added type column to journey_nodes';
  END IF;
END $$;

-- Add points_reward column (XP points for completing the task)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_nodes'
      AND column_name = 'points_reward'
  ) THEN
    ALTER TABLE public.journey_nodes
    ADD COLUMN points_reward int DEFAULT 0;
    RAISE NOTICE 'Added points_reward column to journey_nodes';
  END IF;
END $$;

-- Add cta_route column (navigation route for call-to-action)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_nodes'
      AND column_name = 'cta_route'
  ) THEN
    ALTER TABLE public.journey_nodes
    ADD COLUMN cta_route text;
    RAISE NOTICE 'Added cta_route column to journey_nodes';
  END IF;
END $$;

-- Add metadata column to journey_nodes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_nodes'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.journey_nodes
    ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb NOT NULL;
    RAISE NOTICE 'Added metadata column to journey_nodes';
  END IF;
END $$;

-- ============================================================================
-- 3. Mark Existing Seed Chapters
-- ============================================================================

-- Tag existing demo/seed chapters with source='seed' in metadata
UPDATE public.journey_chapters
SET metadata = metadata || jsonb_build_object('source', 'seed')
WHERE id IN (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid
)
AND NOT (metadata ? 'source');

-- ============================================================================
-- 4. Update v_user_chapter_status View
-- ============================================================================

-- Drop and recreate the view to ensure it works with new columns
DROP VIEW IF EXISTS public.v_user_chapter_status CASCADE;

CREATE OR REPLACE VIEW public.v_user_chapter_status AS
SELECT
  p.user_id,
  c.id AS chapter_id,
  c.slug AS chapter_slug,
  c.title AS chapter_name,
  c.subtitle AS chapter_subtitle,
  c.order_index,
  c.metadata AS chapter_metadata,
  COALESCE(SUM(CASE WHEN up.state = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_nodes,
  COUNT(n.id) AS total_nodes,
  CASE
    -- No nodes in chapter
    WHEN COUNT(n.id) = 0 THEN 'LOCKED'
    -- All nodes completed
    WHEN COALESCE(SUM(CASE WHEN up.state = 'COMPLETED' THEN 1 ELSE 0 END), 0) = COUNT(n.id) THEN 'COMPLETED'
    -- At least one node is active or completed
    WHEN EXISTS (
      SELECT 1
      FROM public.user_progress up2
      WHERE up2.user_id = p.user_id
        AND up2.node_id IN (SELECT id FROM public.journey_nodes WHERE chapter_id = c.id)
        AND up2.state IN ('ACTIVE', 'AVAILABLE', 'COMPLETED')
    ) THEN 'ACTIVE'
    -- Default: locked
    ELSE 'LOCKED'
  END AS chapter_state
FROM public.journey_chapters c
LEFT JOIN public.journey_nodes n ON n.chapter_id = c.id
-- Get all users who have any progress or exist in auth
CROSS JOIN (
  SELECT DISTINCT user_id FROM public.user_progress
  UNION
  SELECT id AS user_id FROM auth.users
) p
LEFT JOIN public.user_progress up
  ON up.user_id = p.user_id AND up.node_id = n.id
GROUP BY p.user_id, c.id, c.slug, c.title, c.subtitle, c.order_index, c.metadata;

-- Grant permissions
GRANT SELECT ON public.v_user_chapter_status TO authenticated;

-- Enable RLS
ALTER VIEW public.v_user_chapter_status SET (security_invoker = on);

-- ============================================================================
-- 5. Add Indexes for Performance
-- ============================================================================

-- Index on metadata for filtering by source
CREATE INDEX IF NOT EXISTS idx_journey_chapters_metadata_source
ON public.journey_chapters((metadata->>'source'));

-- Index on metadata for filtering by avatar_key
CREATE INDEX IF NOT EXISTS idx_journey_chapters_metadata_avatar
ON public.journey_chapters((metadata->>'avatar_key'));

-- Index on type for journey_nodes
CREATE INDEX IF NOT EXISTS idx_journey_nodes_type
ON public.journey_nodes(type);

-- ============================================================================
-- 6. Add Comments
-- ============================================================================

COMMENT ON COLUMN public.journey_chapters.metadata IS 'JSON metadata including source (seed/avatar/custom), avatar_key, template info';
COMMENT ON COLUMN public.journey_chapters.subtitle IS 'Optional subtitle/description for chapter';

COMMENT ON COLUMN public.journey_nodes.type IS 'Task type: meal_log, protein_target, calorie_window, weigh_in, streak_days, habit_check, edu_read';
COMMENT ON COLUMN public.journey_nodes.points_reward IS 'XP points awarded for completing this task';
COMMENT ON COLUMN public.journey_nodes.cta_route IS 'Navigation route for call-to-action button (e.g., /meals/log)';
COMMENT ON COLUMN public.journey_nodes.metadata IS 'JSON metadata including task_key, template info, etc.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  v_chapters_count integer;
  v_seed_count integer;
BEGIN
  SELECT COUNT(*) INTO v_chapters_count FROM public.journey_chapters;
  SELECT COUNT(*) INTO v_seed_count FROM public.journey_chapters WHERE metadata->>'source' = 'seed';

  RAISE NOTICE 'Journey personalization migration complete';
  RAISE NOTICE 'Total chapters: %, Seed chapters: %', v_chapters_count, v_seed_count;
END $$;

COMMIT;
