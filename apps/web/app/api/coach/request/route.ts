import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/coach/request
 * Request a coach assignment
 * In dev: creates mock coach link immediately
 * In prod: queues request for ops team
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

    const isDev =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_DEV_COACH === "1";

    if (isDev) {
      // Dev mode: create or get mock coach immediately
      const { data: coachId, error: rpcError } = await supabase.rpc(
        "get_or_create_dev_coach",
        {
          p_user_id: user.id,
        }
      );

      if (rpcError) {
        console.error("[POST /api/coach/request] RPC error:", rpcError);
        return NextResponse.json(
          { error: "Failed to assign coach" },
          { status: 500 }
        );
      }

      // Fetch coach details
      const { data: coach, error: coachError } = await supabase
        .from("coaches")
        .select("*")
        .eq("id", coachId)
        .single();

      if (coachError) {
        console.error("[POST /api/coach/request] Coach fetch error:", coachError);
        return NextResponse.json(
          { error: "Failed to fetch coach" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        data: {
          assigned: true,
          coach,
        },
      });
    } else {
      // Production mode: queue request
      const { error: insertError } = await supabase
        .from("coach_requests")
        .insert({
          user_id: user.id,
          status: "pending",
        });

      if (insertError) {
        console.error("[POST /api/coach/request] Insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to create request" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        data: {
          queued: true,
        },
      });
    }
  } catch (error) {
    console.error("[POST /api/coach/request] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
