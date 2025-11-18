import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

export const dynamic = "force-dynamic";

/**
 * POST /api/coach/tasks/:taskId/toggle
 * Toggle task completion
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Rate limiting check
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'coach-tasks-toggle',
    });

    if (!rateLimit.allowed) {
      console.log('[Coach Tasks Toggle] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const { taskId } = params;
    const body = await request.json().catch(() => ({}));
    const note = body.note || null;

    // Verify task belongs to user's assignment
    const { data: task, error: taskError } = await supabase
      .from("coach_tasks")
      .select(`
        id,
        assignment_id,
        assignment:coach_assignments!inner(user_id)
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.log('[Coach Tasks Toggle] Task not found');
      return ErrorResponses.notFound("Task not found");
    }

    const assignment = task.assignment as any;
    if (assignment.user_id !== user.id) {
      console.log('[Coach Tasks Toggle] Access denied: user does not own task');
      return ErrorResponses.forbidden("Access denied");
    }

    // Check if completion exists
    const { data: existingCompletion, error: completionError } = await supabase
      .from("coach_task_completions")
      .select("id")
      .eq("task_id", taskId)
      .eq("user_id", user.id)
      .single();

    let isCompleted = false;

    if (completionError && completionError.code === "PGRST116") {
      // No completion exists - create one
      const { error: insertError } = await supabase
        .from("coach_task_completions")
        .insert({
          task_id: taskId,
          user_id: user.id,
          note,
        });

      if (insertError) {
        console.error("[Coach Tasks Toggle] Insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to complete task" },
          { status: 500 }
        );
      }

      isCompleted = true;
    } else if (existingCompletion) {
      // Completion exists - delete it (uncomplete)
      const { error: deleteError } = await supabase
        .from("coach_task_completions")
        .delete()
        .eq("id", existingCompletion.id);

      if (deleteError) {
        console.error("[Coach Tasks Toggle] Delete error:", deleteError);
        return NextResponse.json(
          { error: "Failed to uncomplete task" },
          { status: 500 }
        );
      }

      isCompleted = false;
    }

    return NextResponse.json({ ok: true, data: { isCompleted } });
  } catch (error) {
    console.error("[Coach Tasks Toggle] Error:", error);
    return handleApiError(error, 'CoachTasksToggle');
  }
}
