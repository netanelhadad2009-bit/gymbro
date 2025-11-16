import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSessionSchema } from "@/lib/schemas/coach";
import { hasSessionOverlap } from "@/lib/coach/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/coach/sessions
 * Create a new session
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
    const validationResult = createSessionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Validate time range
    const startTime = new Date(data.start_t);
    const endTime = new Date(data.end_t);

    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    // Verify assignment belongs to user
    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_assignments")
      .select("id, user_id")
      .eq("id", data.assignment_id)
      .eq("user_id", user.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Assignment not found or access denied" },
        { status: 404 }
      );
    }

    // Check for overlapping sessions
    const overlap = await hasSessionOverlap(
      data.assignment_id,
      data.start_t,
      data.end_t
    );

    if (overlap) {
      return NextResponse.json(
        { error: "Session time overlaps with existing session" },
        { status: 409 }
      );
    }

    // Generate placeholder meet URL for video sessions
    let meetUrl = data.meet_url || null;
    if (data.kind === "video" && !meetUrl) {
      // TODO: Integrate with actual video provider (Zoom, Google Meet, etc.)
      meetUrl = `https://meet.fitjourney.app/session/${crypto.randomUUID()}`;
    }

    // Create session
    const { data: session, error: insertError } = await supabase
      .from("coach_sessions")
      .insert({
        assignment_id: data.assignment_id,
        start_t: data.start_t,
        end_t: data.end_t,
        kind: data.kind,
        meet_url: meetUrl,
        location: data.location || null,
        notes: data.notes || null,
        status: "scheduled",
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/coach/sessions] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: session });
  } catch (error) {
    console.error("[POST /api/coach/sessions] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/coach/sessions?assignment_id=xxx
 * Get sessions for an assignment
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
    const assignmentId = searchParams.get("assignment_id");

    if (!assignmentId) {
      return NextResponse.json(
        { error: "assignment_id required" },
        { status: 400 }
      );
    }

    // Verify assignment belongs to user
    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_assignments")
      .select("id, user_id")
      .eq("id", assignmentId)
      .eq("user_id", user.id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Assignment not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch sessions
    const { data: sessions, error } = await supabase
      .from("coach_sessions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("start_t", { ascending: false });

    if (error) {
      console.error("[GET /api/coach/sessions] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: sessions || [] });
  } catch (error) {
    console.error("[GET /api/coach/sessions] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
