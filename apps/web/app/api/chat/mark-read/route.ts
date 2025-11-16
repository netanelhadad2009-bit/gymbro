import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markReadSchema } from "@/lib/schemas/chat";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/mark-read
 * Mark messages as read
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validationResult = markReadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Verify user is member of thread
    const { data: thread, error: threadError } = await supabase
      .from("coach_threads")
      .select("user_id, coach_id")
      .eq("id", data.thread_id)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    if (thread.user_id !== user.id && thread.coach_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Mark messages as read (only messages from the other party)
    const { error: updateError } = await supabase
      .from("coach_chat_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", data.message_ids)
      .eq("thread_id", data.thread_id)
      .neq("sender_id", user.id)
      .is("read_at", null);

    if (updateError) {
      console.error("[POST /api/chat/mark-read] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to mark messages as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/chat/mark-read] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
