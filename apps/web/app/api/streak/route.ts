/**
 * GET /api/streak
 *
 * Get streak summary for the authenticated user.
 *
 * Response:
 * {
 *   ok: true,
 *   data: StreakSummary
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";
import { getStreakSummary } from "@/lib/streak";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - read operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'streak-get',
    });

    if (!rateLimit.allowed) {
      console.log('[Streak] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user } = auth;

    // Get streak summary
    const summary = await getStreakSummary(user.id);

    return NextResponse.json({
      ok: true,
      data: summary,
    });
  } catch (error) {
    console.error("[Streak] Fatal error:", error);
    return handleApiError(error, 'Streak');
  }
}
