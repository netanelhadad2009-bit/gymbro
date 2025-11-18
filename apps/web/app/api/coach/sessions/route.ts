import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSessionSchema } from "@/lib/schemas/coach";
import { hasSessionOverlap } from "@/lib/coach/queries";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

export const dynamic = "force-dynamic";

/**
 * POST /api/coach/sessions
 * Create a new session
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'coach-sessions-post',
    });

    if (!rateLimit.allowed) {
      console.log('[Coach Sessions POST] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, createSessionSchema);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // Validate time range
    const startTime = new Date(data.start_t);
    const endTime = new Date(data.end_t);

    if (endTime <= startTime) {
      return ErrorResponses.badRequest("End time must be after start time");
    }

    // Verify assignment belongs to user
    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_assignments")
      .select("id, user_id")
      .eq("id", data.assignment_id)
      .eq("user_id", user.id)
      .single();

    if (assignmentError || !assignment) {
      console.log('[Coach Sessions POST] Assignment not found or access denied');
      return ErrorResponses.notFound("Assignment not found or access denied");
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
      console.error("[Coach Sessions POST] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: session });
  } catch (error) {
    console.error("[Coach Sessions POST] Error:", error);
    return handleApiError(error, 'CoachSessionsPost');
  }
}

/**
 * GET /api/coach/sessions?assignment_id=xxx
 * Get sessions for an assignment
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'coach-sessions-get',
    });

    if (!rateLimit.allowed) {
      console.log('[Coach Sessions GET] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get("assignment_id");

    if (!assignmentId) {
      return ErrorResponses.badRequest("assignment_id required");
    }

    // Verify assignment belongs to user
    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_assignments")
      .select("id, user_id")
      .eq("id", assignmentId)
      .eq("user_id", user.id)
      .single();

    if (assignmentError || !assignment) {
      console.log('[Coach Sessions GET] Assignment not found or access denied');
      return ErrorResponses.notFound("Assignment not found or access denied");
    }

    // Fetch sessions
    const { data: sessions, error } = await supabase
      .from("coach_sessions")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("start_t", { ascending: false });

    if (error) {
      console.error("[Coach Sessions GET] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: sessions || [] });
  } catch (error) {
    console.error("[Coach Sessions GET] Error:", error);
    return handleApiError(error, 'CoachSessionsGet');
  }
}
