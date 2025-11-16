-- Migration: Journey Chapter Status View
-- Description: Create view for per-user chapter status and progress tracking
-- Idempotent: Safe to re-run

-- ============================================================================
-- Add slug column to journey_chapters if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journey_chapters'
      AND column_name = 'slug'
  ) THEN
    ALTER TABLE public.journey_chapters ADD COLUMN slug text;
  END IF;
END $$;

-- Add unique constraint on slug
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'journey_chapters_slug_key'
  ) THEN
    ALTER TABLE public.journey_chapters
    ADD CONSTRAINT journey_chapters_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Update existing chapters with slugs if they don't have them
UPDATE public.journey_chapters
SET slug = CASE
  WHEN title LIKE '%בסיס%' THEN 'basics'
  WHEN title LIKE '%פרי%' OR title LIKE '%מתקדם%' THEN 'advanced'
  WHEN title LIKE '%מומחה%' THEN 'expert'
  ELSE lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
END
WHERE slug IS NULL;

-- ============================================================================
-- Chapter Status View
-- ============================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.v_user_chapter_status;

-- Create view for per-user chapter status
CREATE OR REPLACE VIEW public.v_user_chapter_status AS
SELECT
  p.user_id,
  c.id AS chapter_id,
  c.slug AS chapter_slug,
  c.title AS chapter_name,
  c.order_index,
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
-- Get all users who have any progress
CROSS JOIN (
  SELECT DISTINCT user_id FROM public.user_progress
  UNION
  SELECT id AS user_id FROM auth.users
) p
LEFT JOIN public.user_progress up
  ON up.user_id = p.user_id AND up.node_id = n.id
GROUP BY p.user_id, c.id, c.slug, c.title, c.order_index;

-- Grant permissions
GRANT SELECT ON public.v_user_chapter_status TO authenticated;

-- Enable RLS
ALTER VIEW public.v_user_chapter_status SET (security_invoker = on);

-- Create policy for view (users can only see their own chapter status)
-- Note: Views with security_invoker use the calling user's permissions
-- So we rely on the underlying table RLS policies

-- ============================================================================
-- Helper Function: Get User's Current Chapter
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_user_current_chapter(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_chapter_id uuid;
BEGIN
  -- Find the first chapter that is ACTIVE or has incomplete nodes
  SELECT chapter_id INTO v_chapter_id
  FROM public.v_user_chapter_status
  WHERE user_id = p_user_id
    AND chapter_state IN ('ACTIVE')
  ORDER BY order_index
  LIMIT 1;

  -- If no active chapter, return the first chapter
  IF v_chapter_id IS NULL THEN
    SELECT id INTO v_chapter_id
    FROM public.journey_chapters
    ORDER BY order_index
    LIMIT 1;
  END IF;

  RETURN v_chapter_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_user_current_chapter TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================

-- Test the view (should return results for existing users)
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.v_user_chapter_status;

  RAISE NOTICE 'Chapter status view created successfully. Rows: %', v_count;
END $$;
