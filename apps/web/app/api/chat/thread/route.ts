import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/chat/thread
 * Get or create a chat thread for the user's active coach assignment
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

    // Get active assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_assignments")
      .select("id, user_id, coach_id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "No active coach assignment found" },
        { status: 404 }
      );
    }

    // Check if thread already exists
    const { data: existingThread, error: threadError } = await supabase
      .from("coach_threads")
      .select("*")
      .eq("assignment_id", assignment.id)
      .single();

    if (threadError && threadError.code !== "PGRST116") {
      console.error("[POST /api/chat/thread] Thread query error:", threadError);
      return NextResponse.json(
        { error: "Failed to query thread" },
        { status: 500 }
      );
    }

    let thread = existingThread;

    // Create thread if it doesn't exist
    if (!thread) {
      const { data: newThread, error: createError } = await supabase
        .from("coach_threads")
        .insert({
          assignment_id: assignment.id,
          user_id: assignment.user_id,
          coach_id: assignment.coach_id,
        })
        .select()
        .single();

      if (createError) {
        console.error("[POST /api/chat/thread] Create error:", createError);
        return NextResponse.json(
          { error: "Failed to create thread" },
          { status: 500 }
        );
      }

      thread = newThread;
    }

    // Fetch initial messages (last 40)
    const { data: messages, error: messagesError } = await supabase
      .from("coach_chat_messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: false })
      .limit(40);

    if (messagesError) {
      console.error("[POST /api/chat/thread] Messages error:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        thread,
        messages: (messages || []).reverse(), // Return in chronological order
        hasMore: (messages || []).length === 40,
      },
    });
  } catch (error) {
    console.error("[POST /api/chat/thread] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat/thread?thread_id=xxx&before=timestamp&limit=40
 * Load more messages (pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("thread_id");
    const before = searchParams.get("before");
    const limit = parseInt(searchParams.get("limit") || "40", 10);

    if (!threadId) {
      return NextResponse.json(
        { error: "thread_id required" },
        { status: 400 }
      );
    }

    // Verify user is member of thread
    const { data: thread, error: threadError } = await supabase
      .from("coach_threads")
      .select("*")
      .eq("id", threadId)
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

    // Fetch messages before timestamp
    let query = supabase
      .from("coach_chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      console.error("[GET /api/chat/thread] Messages error:", messagesError);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        messages: (messages || []).reverse(),
        hasMore: (messages || []).length === limit,
      },
    });
  } catch (error) {
    console.error("[GET /api/chat/thread] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
