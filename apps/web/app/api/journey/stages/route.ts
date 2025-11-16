/**
 * GET /api/journey/stages
 *
 * Returns user's stages with tasks and computed progress
 * Includes active stage determination and task completion states
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserStages, getActiveStage } from '@/lib/journey/stages/persist';
import { evaluateTaskCondition, type TaskCondition } from '@/lib/journey/rules/eval';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function GET(request: NextRequest) {
  try {
    console.log('[StagesAPI] GET /api/journey/stages - Start');

    // Auth check
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('[StagesAPI] Auth error:', authError?.message || 'No session');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const userId = session.user.id;
    console.log('[StagesAPI] Authenticated:', userId.substring(0, 8));

    // Fetch stages with tasks
    const stages = await getUserStages(supabase, userId);

    if (stages.length === 0) {
      console.log('[StagesAPI] No stages found');
      return NextResponse.json(
        {
          ok: true,
          stages: [],
          activeStageIndex: null,
          message: 'No stages found. Call /bootstrap first.',
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Get active stage
    const activeStage = await getActiveStage(supabase, userId);
    const activeStageIndex = activeStage ? stages.findIndex(s => s.id === activeStage.id) : null;

    console.log('[StagesAPI] Found stages:', {
      count: stages.length,
      activeIndex: activeStageIndex,
    });

    // Calculate unlockedUpToIndex (highest completed stage index)
    let unlockedUpToIndex = -1;
    for (let i = stages.length - 1; i >= 0; i--) {
      if (stages[i].is_completed) {
        unlockedUpToIndex = i;
        break;
      }
    }

    // Compute progress for each task
    const stagesWithProgress = await Promise.all(
      stages.map(async (stage) => {
        const isLockedStage = !stage.is_unlocked;

        const tasksWithProgress = await Promise.all(
          stage.tasks.map(async (task) => {
            // If task already completed, return 100%
            if (task.is_completed) {
              return {
                ...task,
                progress: 1,
                canComplete: true,
                lockedByStage: isLockedStage,
              };
            }

            // Evaluate condition
            try {
              const condition: TaskCondition = task.condition_json;
              const evaluation = await evaluateTaskCondition(supabase, userId, condition);

              return {
                ...task,
                progress: evaluation.progress,
                canComplete: evaluation.canComplete,
                current: evaluation.current,
                target: evaluation.target,
                details: evaluation.details,
                lockedByStage: isLockedStage,
              };
            } catch (err) {
              console.error('[StagesAPI] Error evaluating task:', task.key_code, err);
              return {
                ...task,
                progress: 0,
                canComplete: false,
                lockedByStage: isLockedStage,
              };
            }
          })
        );

        return {
          ...stage,
          tasks: tasksWithProgress,
        };
      })
    );

    return NextResponse.json(
      {
        ok: true,
        stages: stagesWithProgress,
        activeStageIndex,
        unlockedUpToIndex,
        message: `Found ${stages.length} stages`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[StagesAPI] Fatal error:', {
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'ServerError',
        message: err?.message || 'Unknown error',
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
