import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'coach-messages',
    });

    if (!rateLimit.allowed) {
      console.log('[Coach Messages] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Fetch last 100 messages (newest first), then reverse to show oldest first
    const { data, error } = await supabase
      .from("ai_messages")
      .select("id, role, content, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    // Reverse to show in chronological order (oldest first)
    const messages = data ? data.reverse() : [];

    if (error) {
      console.error("[Coach Messages] Select error:", error);
      return NextResponse.json(
        { ok: false, error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, messages });
  } catch (error) {
    console.error("[Coach Messages] Error:", error);
    return handleApiError(error, 'CoachMessages');
  }
}
