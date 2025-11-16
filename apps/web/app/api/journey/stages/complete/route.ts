/**
 * POST /api/journey/stages/complete
 *
 * Completes a task if conditions are met
 * Marks stage as completed if all tasks done, and unlocks next stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { completeTask } from '@/lib/journey/stages/persist';
import { evaluateTaskCondition, type TaskCondition } from '@/lib/journey/rules/eval';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

const CompleteBodySchema = z.object({
  stageId: z.string().uuid(),
  taskId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    console.log('[StagesComplete] POST /api/journey/stages/complete - Start');

    // Parse body
    const body = await request.json();
    const validation = CompleteBodySchema.safeParse(body);

    if (!validation.success) {
      console.error('[StagesComplete] Invalid body:', validation.error.flatten());
      return NextResponse.json(
        {
          ok: false,
          error: 'InvalidInput',
          message: 'Missing or invalid required fields',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { stageId, taskId } = validation.data;

    // Auth check
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('[StagesComplete] Auth error:', authError?.message || 'No session');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const userId = session.user.id;
    console.log('[StagesComplete] Authenticated:', {
      userId: userId.substring(0, 8),
      stageId: stageId.substring(0, 8),
      taskId: taskId.substring(0, 8),
    });

    // Fetch task with condition
    const { data: task, error: taskError } = await supabase
      .from('user_stage_tasks')
      .select('*, user_stages!inner(user_id, id, stage_index, title_he, is_unlocked)')
      .eq('id', taskId)
      .eq('user_stage_id', stageId)
      .single();

    if (taskError || !task) {
      console.error('[StagesComplete] Task not found:', taskError?.message);
      return NextResponse.json(
        { ok: false, error: 'NotFound', message: 'Task not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    if ((task.user_stages as any).user_id !== userId) {
      console.error('[StagesComplete] Unauthorized access');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', message: 'Task does not belong to user' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Check if parent stage is locked
    if (!(task.user_stages as any).is_unlocked) {
      console.error('[StagesComplete] Stage is locked');
      return NextResponse.json(
        { ok: false, error: 'stage_locked', message: 'השלב הזה נעול. השלם את השלב הקודם כדי לפתוח' },
        { status: 403, headers: NO_CACHE_HEADERS }
      );
    }

    // Check if already completed
    if (task.is_completed) {
      console.log('[StagesComplete] Task already completed');
      return NextResponse.json(
        {
          ok: true,
          alreadyCompleted: true,
          unlockedNext: false,
          stageCompleted: false,
          message: 'Task already completed',
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Evaluate conditions
    const condition: TaskCondition = task.condition_json;
    const evaluation = await evaluateTaskCondition(supabase, userId, condition);

    if (!evaluation.canComplete) {
      console.log('[StagesComplete] Conditions not met:', {
        progress: evaluation.progress,
        current: evaluation.current,
        target: evaluation.target,
      });

      return NextResponse.json(
        {
          ok: false,
          error: 'ConditionsNotMet',
          message: 'Task conditions not satisfied',
          progress: evaluation.progress,
          current: evaluation.current,
          target: evaluation.target,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Mark task as completed
    const result = await completeTask(supabase, userId, stageId, taskId);

    // Award points
    const { error: pointsError } = await supabase
      .from('user_points')
      .insert({
        user_id: userId,
        points: task.points,
        reason: `השלמת: ${task.title_he} (${(task.user_stages as any).title_he})`,
      });

    if (pointsError) {
      console.warn('[StagesComplete] Points error:', pointsError.message);
      // Non-fatal - continue
    }

    console.log('[StagesComplete] Success:', {
      points: task.points,
      unlockedNext: result.unlockedNext,
      stageCompleted: result.stageCompleted,
    });

    return NextResponse.json(
      {
        ok: true,
        pointsAwarded: task.points,
        unlockedNext: result.unlockedNext,
        stageCompleted: result.stageCompleted,
        message: `השלמת בהצלחה! קיבלת ${task.points} נקודות`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[StagesComplete] Fatal error:', {
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
