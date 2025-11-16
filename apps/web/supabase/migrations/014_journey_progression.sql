-- Migration: Journey Progression Enhancement
-- Add current_node_id and ensure completed_at exists in user_progress

-- Add current_node_id to user_progress if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_progress'
        AND column_name = 'current_node_id'
    ) THEN
        ALTER TABLE public.user_progress
        ADD COLUMN current_node_id UUID REFERENCES public.journey_nodes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Ensure completed_at exists (should already be there from previous migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_progress'
        AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE public.user_progress
        ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create or replace function to get journey with proper status logic
CREATE OR REPLACE FUNCTION public.get_journey_with_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
    v_last_completed_order INT;
    v_active_node_id UUID;
BEGIN
    -- Get the order index of the last completed node
    SELECT COALESCE(MAX(n.order_index), -1)
    INTO v_last_completed_order
    FROM public.user_progress up
    JOIN public.journey_nodes n ON n.id = up.node_id
    WHERE up.user_id = p_user_id
    AND up.completed_at IS NOT NULL;

    -- Get the active node (next after last completed)
    SELECT n.id
    INTO v_active_node_id
    FROM public.journey_nodes n
    WHERE n.order_index = v_last_completed_order + 1
    LIMIT 1;

    -- Build the complete journey structure with status
    SELECT json_build_object(
        'chapters', COALESCE(
            json_agg(DISTINCT
                json_build_object(
                    'id', c.id,
                    'title', c.title,
                    'description', c.description,
                    'order_index', c.order_index,
                    'nodes', (
                        SELECT json_agg(
                            json_build_object(
                                'id', n.id,
                                'chapter_id', n.chapter_id,
                                'title', n.title,
                                'description', n.description,
                                'icon', n.icon,
                                'order_index', n.order_index,
                                'primary_task', n.primary_task,
                                'conditions_json', n.conditions_json,
                                'points', n.points,
                                'progress', json_build_object(
                                    'state', CASE
                                        WHEN up.completed_at IS NOT NULL THEN 'COMPLETED'
                                        WHEN n.id = v_active_node_id OR (v_last_completed_order = -1 AND n.order_index = 0) THEN 'ACTIVE'
                                        WHEN n.order_index <= v_last_completed_order THEN 'COMPLETED'
                                        ELSE 'LOCKED'
                                    END,
                                    'started_at', up.started_at,
                                    'completed_at', up.completed_at,
                                    'progress_json', COALESCE(up.progress_json, '{}'::jsonb)
                                )
                            )
                            ORDER BY n.order_index
                        )
                        FROM public.journey_nodes n
                        LEFT JOIN public.user_progress up
                            ON up.node_id = n.id
                            AND up.user_id = p_user_id
                        WHERE n.chapter_id = c.id
                    )
                )
                ORDER BY c.order_index
            ),
            '[]'::json
        ),
        'total_points', (
            SELECT COALESCE(SUM(n.points), 0)
            FROM public.user_progress up
            JOIN public.journey_nodes n ON n.id = up.node_id
            WHERE up.user_id = p_user_id
            AND up.completed_at IS NOT NULL
        ),
        'total_badges', (
            SELECT COUNT(DISTINCT up.node_id)
            FROM public.user_progress up
            WHERE up.user_id = p_user_id
            AND up.completed_at IS NOT NULL
        ),
        'current_node_id', v_active_node_id
    ) INTO v_result
    FROM public.journey_chapters c;

    RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_journey_with_status TO authenticated;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_current_node
ON public.user_progress(user_id, current_node_id)
WHERE current_node_id IS NOT NULL;