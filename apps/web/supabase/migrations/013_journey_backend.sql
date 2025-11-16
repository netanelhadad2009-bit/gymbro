-- Migration: Journey Map Backend
-- Description: Complete backend for gamified journey system with chapters, nodes, progress tracking, points, and badges
-- Idempotent: Safe to re-run

-- ============================================================================
-- TABLES
-- ============================================================================

-- Journey Chapters (main sections of the journey)
CREATE TABLE IF NOT EXISTS public.journey_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Journey Nodes (individual tasks/milestones within chapters)
CREATE TABLE IF NOT EXISTS public.journey_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.journey_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order_index int NOT NULL DEFAULT 0,
  icon text,
  primary_task text,
  conditions_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- User Progress (tracks user state for each node)
CREATE TABLE IF NOT EXISTS public.user_progress (
  user_id uuid NOT NULL,
  node_id uuid NOT NULL REFERENCES public.journey_nodes(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'LOCKED' CHECK (state IN ('LOCKED', 'AVAILABLE', 'ACTIVE', 'COMPLETED')),
  progress_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, node_id)
);

-- User Points (gamification points log)
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT current_date,
  points int NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- User Badges (achievements)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_code text NOT NULL,
  earned_at timestamptz DEFAULT now(),
  UNIQUE (user_id, badge_code)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_journey_chapters_order ON public.journey_chapters(order_index);
CREATE INDEX IF NOT EXISTS idx_journey_nodes_chapter_order ON public.journey_nodes(chapter_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_state ON public.user_progress(user_id, state);
CREATE INDEX IF NOT EXISTS idx_user_points_user_date ON public.user_points(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_code ON public.user_badges(user_id, badge_code);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on user tables
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "user_progress_select" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_insert" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_update" ON public.user_progress;
DROP POLICY IF EXISTS "user_progress_delete" ON public.user_progress;

DROP POLICY IF EXISTS "user_points_select" ON public.user_points;
DROP POLICY IF EXISTS "user_points_insert" ON public.user_points;
DROP POLICY IF EXISTS "user_points_update" ON public.user_points;
DROP POLICY IF EXISTS "user_points_delete" ON public.user_points;

DROP POLICY IF EXISTS "user_badges_select" ON public.user_badges;
DROP POLICY IF EXISTS "user_badges_insert" ON public.user_badges;
DROP POLICY IF EXISTS "user_badges_update" ON public.user_badges;
DROP POLICY IF EXISTS "user_badges_delete" ON public.user_badges;

-- User Progress Policies
CREATE POLICY "user_progress_select" ON public.user_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_progress_insert" ON public.user_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_progress_update" ON public.user_progress
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_progress_delete" ON public.user_progress
  FOR DELETE USING (user_id = auth.uid());

-- User Points Policies
CREATE POLICY "user_points_select" ON public.user_points
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_points_insert" ON public.user_points
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_points_update" ON public.user_points
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_points_delete" ON public.user_points
  FOR DELETE USING (user_id = auth.uid());

-- User Badges Policies
CREATE POLICY "user_badges_select" ON public.user_badges
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_badges_insert" ON public.user_badges
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_badges_update" ON public.user_badges
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "user_badges_delete" ON public.user_badges
  FOR DELETE USING (user_id = auth.uid());

-- Journey chapters and nodes are read-only (no RLS)
-- They can be read by anyone but only modified by admins via SQL

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function to auto-set user_id from auth context
CREATE OR REPLACE FUNCTION public.fn_set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_user_progress_set_user_id ON public.user_progress;
DROP TRIGGER IF EXISTS trigger_user_progress_update_timestamp ON public.user_progress;
DROP TRIGGER IF EXISTS trigger_user_points_set_user_id ON public.user_points;
DROP TRIGGER IF EXISTS trigger_user_badges_set_user_id ON public.user_badges;

-- Apply triggers
CREATE TRIGGER trigger_user_progress_set_user_id
  BEFORE INSERT ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_user_id();

CREATE TRIGGER trigger_user_progress_update_timestamp
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.fn_update_timestamp();

CREATE TRIGGER trigger_user_points_set_user_id
  BEFORE INSERT ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_user_id();

CREATE TRIGGER trigger_user_badges_set_user_id
  BEFORE INSERT ON public.user_badges
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_user_id();

-- ============================================================================
-- REALTIME
-- ============================================================================

-- Set replica identity for realtime
ALTER TABLE public.user_progress REPLICA IDENTITY FULL;

-- Add table to realtime publication (idempotent)
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'user_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
  END IF;
END $$;

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert demo chapters (idempotent - only if not exists)
INSERT INTO public.journey_chapters (id, title, order_index)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'שלב הבסיסים', 1),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'שלב הפרי', 2)
ON CONFLICT (id) DO NOTHING;

-- Insert demo nodes (idempotent - only if not exists)
INSERT INTO public.journey_nodes (id, chapter_id, title, description, order_index, icon, primary_task, conditions_json)
VALUES
  (
    '00000000-0000-0000-0000-000000000101'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'שקילה ראשונה',
    'תעד את המשקל הנוכחי שלך כדי להתחיל את המסע',
    1,
    '⚖️',
    'weigh_in_today',
    '{"primary":"weigh_in_today"}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000102'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'תיעוד ארוחות',
    'תעד לפחות 2 ארוחות היום',
    2,
    '🍽️',
    'log_meals',
    '{"primary":"log_2_meals","checklist":["log_2_meals"]}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000103'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'יעד חלבון',
    'השג לפחות 80 גרם חלבון ביום',
    3,
    '🥩',
    'protein_min',
    '{"primary":"protein_min","checklist":["protein_min"],"thresholds":{"protein_g":80}}'::jsonb
  ),
  (
    '00000000-0000-0000-0000-000000000201'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    'שבוע עקבי',
    'תעד ארוחות במשך 7 ימים רצופים',
    1,
    '📅',
    'log_streak_7',
    '{"primary":"log_streak_7","checklist":["log_streak_7"],"thresholds":{"streak_days":7}}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.journey_chapters IS 'Main sections of the user journey';
COMMENT ON TABLE public.journey_nodes IS 'Individual tasks/milestones within chapters';
COMMENT ON TABLE public.user_progress IS 'Tracks user completion state for each node';
COMMENT ON TABLE public.user_points IS 'Log of points earned by users';
COMMENT ON TABLE public.user_badges IS 'Badges/achievements earned by users';

COMMENT ON COLUMN public.user_progress.state IS 'LOCKED: not yet available, AVAILABLE: can start, ACTIVE: in progress, COMPLETED: done';
COMMENT ON COLUMN public.journey_nodes.conditions_json IS 'JSON object defining completion conditions: {primary, checklist[], thresholds{}}';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get complete journey view for a user (fast read)
CREATE OR REPLACE FUNCTION public.fn_journey_user_view(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Build complete journey structure with user progress
  SELECT jsonb_build_object(
    'chapters', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'order_index', c.order_index,
            'nodes', COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', n.id,
                    'chapter_id', n.chapter_id,
                    'title', n.title,
                    'description', n.description,
                    'order_index', n.order_index,
                    'icon', n.icon,
                    'primary_task', n.primary_task,
                    'conditions_json', n.conditions_json,
                    'progress', COALESCE(
                      (
                        SELECT jsonb_build_object(
                          'state', up.state,
                          'progress_json', up.progress_json,
                          'completed_at', up.completed_at,
                          'updated_at', up.updated_at
                        )
                        FROM public.user_progress up
                        WHERE up.node_id = n.id AND up.user_id = p_user
                      ),
                      jsonb_build_object(
                        'state', 'LOCKED',
                        'progress_json', '{}'::jsonb,
                        'completed_at', null,
                        'updated_at', null
                      )
                    )
                  )
                  ORDER BY n.order_index
                )
                FROM public.journey_nodes n
                WHERE n.chapter_id = c.id
              ),
              '[]'::jsonb
            )
          )
          ORDER BY c.order_index
        )
        FROM public.journey_chapters c
      ),
      '[]'::jsonb
    ),
    'total_points', COALESCE(
      (SELECT SUM(points) FROM public.user_points WHERE user_id = p_user),
      0
    ),
    'total_badges', COALESCE(
      (SELECT COUNT(*) FROM public.user_badges WHERE user_id = p_user),
      0
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.fn_journey_user_view IS 'Returns complete journey structure with user progress in single query';
