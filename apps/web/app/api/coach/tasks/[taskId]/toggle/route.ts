import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    const assignment = task.assignment as any;
    if (assignment.user_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
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
        console.error("[POST /api/coach/tasks/toggle] Insert error:", insertError);
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
        console.error("[POST /api/coach/tasks/toggle] Delete error:", deleteError);
        return NextResponse.json(
          { error: "Failed to uncomplete task" },
          { status: 500 }
        );
      }

      isCompleted = false;
    }

    return NextResponse.json({ ok: true, data: { isCompleted } });
  } catch (error) {
    console.error("[POST /api/coach/tasks/toggle] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
