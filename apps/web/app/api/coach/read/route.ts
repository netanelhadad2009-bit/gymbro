import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

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
    // Rate limiting check
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'coach-read',
    });

    if (!rateLimit.allowed) {
      console.log('[Coach Read] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, schema);
    if (!validation.success) {
      return validation.response;
    }

    const data = validation.data;

    // Verify user is the client in this thread
    if (data.client_id !== user.id) {
      console.log('[Coach Read] Access denied: user is not the client');
      return ErrorResponses.forbidden("Access denied");
    }

    // Verify client is assigned to this coach
    const { data: assignment, error: assignmentError } = await supabase
      .from("coach_clients")
      .select("id")
      .eq("coach_id", data.coach_id)
      .eq("client_id", data.client_id)
      .single();

    if (assignmentError || !assignment) {
      console.log('[Coach Read] No coach assignment found');
      return ErrorResponses.notFound("No coach assignment found");
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
      console.error("[Coach Read] RPC error:", rpcError);
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
    console.error("[Coach Read] Error:", error);
    return handleApiError(error, 'CoachRead');
  }
}
