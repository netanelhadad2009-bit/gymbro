/**
 * GET /api/points/summary
 *
 * Returns total points and breakdown by stage for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';
import { logger, logRateLimitViolation, sanitizeUserId } from '@/lib/logger';

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
    logger.debug('Points summary request received', {
      endpoint: '/api/points/summary',
    });

    // Rate limiting check (STANDARD - read operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'points-summary-get',
    });

    if (!rateLimit.allowed) {
      logRateLimitViolation({
        endpoint: '/api/points/summary',
        limit: rateLimit.limit,
        current: rateLimit.limit + 1,
      });
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      logger.warn('Points summary authentication failed', {
        endpoint: '/api/points/summary',
      });
      return auth.response;
    }
    const { user, supabase } = auth;

    const userId = user.id;
    logger.debug('User authenticated for points summary', {
      userId: sanitizeUserId(userId),
      endpoint: '/api/points/summary',
    });

    // Get total points
    const { data: pointsData, error: pointsError } = await supabase
      .from('user_points')
      .select('points')
      .eq('user_id', userId);

    if (pointsError) {
      logger.error('Points summary error fetching points', {
        userId: sanitizeUserId(userId),
        error: pointsError.message,
      });
      throw new Error(`Failed to fetch points: ${pointsError.message}`);
    }

    const total = pointsData?.reduce((sum: number, record: { points: number | null }) => sum + (record.points || 0), 0) || 0;

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
      logger.error('Points summary error fetching stages', {
        userId: sanitizeUserId(userId),
        error: stagesError.message,
      });
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

    logger.debug('Points summary success', {
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
    logger.error('Points summary fatal error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return handleApiError(error, 'PointsSummary');
  }
}
