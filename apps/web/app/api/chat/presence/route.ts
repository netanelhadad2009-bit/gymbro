import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { presenceSchema } from "@/lib/schemas/chat";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/presence
 * Update presence (typing indicator, last seen)
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
    const validationResult = presenceSchema.safeParse(body);

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

    // Determine role
    const role = thread.user_id === user.id ? "user" : "coach";

    // Upsert presence
    const { error: upsertError } = await supabase
      .from("coach_presence")
      .upsert(
        {
          thread_id: data.thread_id,
          user_id: user.id,
          role,
          typing: data.typing,
          last_seen: new Date().toISOString(),
        },
        {
          onConflict: "thread_id,user_id",
        }
      );

    if (upsertError) {
      console.error("[POST /api/chat/presence] Upsert error:", upsertError);
      return NextResponse.json(
        { error: "Failed to update presence" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/chat/presence] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
