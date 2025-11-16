import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckinSchema } from "@/lib/schemas/coach";

export const dynamic = "force-dynamic";

/**
 * POST /api/coach/checkins
 * Create a new check-in
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
    const validationResult = createCheckinSchema.safeParse(body);

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

    // Create check-in
    const { data: checkin, error: insertError } = await supabase
      .from("checkins")
      .insert({
        assignment_id: data.assignment_id,
        user_id: user.id,
        date: data.date,
        weight_kg: data.weight_kg || null,
        mood: data.mood || null,
        energy: data.energy || null,
        note: data.note || null,
        photos: data.photos || [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("[POST /api/coach/checkins] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create check-in" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: checkin });
  } catch (error) {
    console.error("[POST /api/coach/checkins] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/coach/checkins?assignment_id=xxx&limit=6
 * Get check-ins for an assignment
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
    const limit = parseInt(searchParams.get("limit") || "6", 10);

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

    // Fetch check-ins
    const { data: checkins, error } = await supabase
      .from("checkins")
      .select("*")
      .eq("assignment_id", assignmentId)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[GET /api/coach/checkins] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch check-ins" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: checkins || [] });
  } catch (error) {
    console.error("[GET /api/coach/checkins] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
