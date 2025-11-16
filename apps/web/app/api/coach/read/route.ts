import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  coach_id: z.string().uuid(),
  client_id: z.string().uuid(),
  up_to_message_id: z.string().uuid(),
});

/**
 * POST /api/coach/read
 * Mark messages as read up to a specific message
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
    const validationResult = schema.safeParse(body);

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

    // Verify user is the client in this thread
    if (data.client_id !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Verify client is assigned to this coach
    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_clients")
      .select("id")
      .eq("coach_id", data.coach_id)
      .eq("client_id", data.client_id)
      .single();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "No coach assignment found" },
        { status: 404 }
      );
    }

    // Call database function to mark messages as read
    const { data: count, error: rpcError } = await supabase.rpc(
      "mark_messages_read",
      {
        p_coach_id: data.coach_id,
        p_client_id: data.client_id,
        p_up_to_message_id: data.up_to_message_id,
        p_reader_role: "client",
      }
    );

    if (rpcError) {
      console.error("[POST /api/coach/read] RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to mark messages as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        marked: count || 0,
      },
    });
  } catch (error) {
    console.error("[POST /api/coach/read] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
