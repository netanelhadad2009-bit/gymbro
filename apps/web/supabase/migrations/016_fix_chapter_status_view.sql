-- Migration: Fix Chapter Status View for All Users
-- Description: Ensure chapter status view returns rows for ALL chapters for current user,
--              even if they have no progress yet. Uses auth.uid() to always return current user's data.
-- Idempotent: Safe to re-run

-- ============================================================================
-- Drop and recreate view with current user context
-- ============================================================================

DROP VIEW IF EXISTS public.v_user_chapter_status;

-- Create view that always returns chapters for the authenticated user
CREATE OR REPLACE VIEW public.v_user_chapter_status
WITH (security_invoker = on) AS
SELECT
  u.id AS user_id,
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
      WHERE up2.user_id = u.id
        AND up2.node_id IN (SELECT id FROM public.journey_nodes WHERE chapter_id = c.id)
        AND up2.state IN ('ACTIVE', 'AVAILABLE', 'COMPLETED')
    ) THEN 'ACTIVE'
    -- Default: locked
    ELSE 'LOCKED'
  END AS chapter_state
FROM public.journey_chapters c
-- Always generate rows for the current authenticated user
CROSS JOIN (
  SELECT auth.uid() AS id
) u
LEFT JOIN public.journey_nodes n ON n.chapter_id = c.id
LEFT JOIN public.user_progress up ON up.user_id = u.id AND up.node_id = n.id
WHERE u.id IS NOT NULL  -- Only return data if user is authenticated
GROUP BY u.id, c.id, c.slug, c.title, c.order_index;

-- Grant permissions
REVOKE ALL ON public.v_user_chapter_status FROM anon, authenticated;
GRANT SELECT ON public.v_user_chapter_status TO authenticated;

-- ============================================================================
-- Add RLS policy for the view
-- ============================================================================

-- Note: security_invoker means the view uses the calling user's permissions
-- The WHERE u.id IS NOT NULL filter ensures only authenticated users see data
-- And since we CROSS JOIN with auth.uid(), users only see their own data

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  v_count integer;
BEGIN
  -- Count chapters (should equal number of chapters × number of users)
  SELECT COUNT(DISTINCT chapter_id) INTO v_count
  FROM public.v_user_chapter_status;

  IF v_count = 0 THEN
    RAISE WARNING 'No chapters found in view. Make sure journey_chapters table has data.';
  ELSE
    RAISE NOTICE 'Chapter status view recreated successfully. Distinct chapters: %', v_count;
  END IF;
END $$;

-- Test query (run this manually after migration to verify)
-- SELECT * FROM v_user_chapter_status WHERE user_id = auth.uid();
