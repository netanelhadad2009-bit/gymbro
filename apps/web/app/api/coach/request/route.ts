import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

export const dynamic = "force-dynamic";

/**
 * POST /api/coach/request
 * Request a coach assignment
 * In dev: creates mock coach link immediately
 * In prod: queues request for ops team
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (stricter for coach requests)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.strict,
      keyPrefix: 'coach-request',
    });

    if (!rateLimit.allowed) {
      console.log('[Coach Request] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

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
        console.error("[Coach Request] RPC error:", rpcError);
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
        console.error("[Coach Request] Coach fetch error:", coachError);
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
        console.error("[Coach Request] Insert error:", insertError);
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
    console.error("[Coach Request] Error:", error);
    return handleApiError(error, 'CoachRequest');
  }
}
