/**
 * GET /api/points/summary
 *
 * Returns total points and breakdown by stage for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';

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

export async function GET(request: NextRequest) {
  try {
    console.log('[PointsSummary] GET /api/points/summary - Start');

    // Rate limiting check (STANDARD - read operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'points-summary-get',
    });

    if (!rateLimit.allowed) {
      console.log('[PointsSummary] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const userId = user.id;
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
  } catch (error) {
    console.error('[PointsSummary] Fatal error:', error);
    return handleApiError(error, 'PointsSummary');
  }
}
