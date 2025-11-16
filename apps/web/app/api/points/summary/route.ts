/**
 * GET /api/points/summary
 *
 * Returns total points and breakdown by stage for the authenticated user
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
};

interface StagePoints {
  stageId: string;
  stageTitle: string;
  points: number;
  completedTasks: number;
}

export async function GET() {
  try {
    console.log('[PointsSummary] GET /api/points/summary - Start');

    // Auth check
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('[PointsSummary] Auth error:', authError?.message || 'No session');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    console.log('[PointsSummary] Authenticated:', userId.substring(0, 8));

    // Get total points
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', userId);

    if (pointsError) {
      console.error('[PointsSummary] Error fetching points:', pointsError);
      throw new Error(`Failed to fetch points: ${pointsError.message}`);
    }

    const total = pointsData?.reduce((sum, record) => sum + (record.points || 0), 0) || 0;

    // Get user stages with task completion counts
    const { data: stages, error: stagesError } = await supabase
      .from('user_stages')
      .select(`
        id,
        title_he,
        stage_index,
        user_stage_tasks (
          id,
          is_completed,
          points
        )
      `)
      .eq('user_id', userId)
      .order('stage_index', { ascending: true });

    if (stagesError) {
      console.error('[PointsSummary] Error fetching stages:', stagesError);
      throw new Error(`Failed to fetch stages: ${stagesError.message}`);
    }

    // Build by-stage breakdown
    const byStage: StagePoints[] = (stages || []).map((stage: any) => {
      const tasks = stage.user_stage_tasks || [];
      const completedTasks = tasks.filter((t: any) => t.is_completed).length;
      const stagePoints = tasks
        .filter((t: any) => t.is_completed)
        .reduce((sum: number, t: any) => sum + (t.points || 0), 0);

      return {
        stageId: stage.id,
        stageTitle: stage.title_he,
        points: stagePoints,
        completedTasks,
      };
    }).filter((s: StagePoints) => s.points > 0); // Only include stages with points

    console.log('[PointsSummary] Success:', {
      total,
      stagesWithPoints: byStage.length,
    });

    return NextResponse.json(
      {
        ok: true,
        total,
        byStage,
      },
      { headers: CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[PointsSummary] Fatal error:', {
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'ServerError',
        message: err?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
