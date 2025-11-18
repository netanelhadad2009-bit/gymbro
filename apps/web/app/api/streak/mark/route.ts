/**
 * POST /api/streak/mark
 *
 * Mark today as done for the authenticated user.
 * Idempotent - can be called multiple times safely.
 *
 * Request body (optional):
 * {
 *   source?: string  // 'nutrition' | 'weight' | 'workout' | 'auto'
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   data: StreakSummary
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";
import { markTodayDone } from "@/lib/streak";
import { z } from "zod";

// Request validation schema
const MarkStreakSchema = z.object({
  source: z.enum(['nutrition', 'weight', 'workout', 'auto']).optional().default('auto'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - write operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'streak-mark-post',
    });

    if (!rateLimit.allowed) {
      console.log('[StreakMark] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user } = auth;

    // Validate request body (optional body with source field)
    let source = 'auto';
    try {
      const validation = await validateBody(request, MarkStreakSchema);
      if (validation.success) {
        source = validation.data.source;
      }
    } catch {
      // Empty body is allowed - use default
    }

    // Mark today and get updated summary
    const summary = await markTodayDone(user.id, source);

    return NextResponse.json({
      ok: true,
      data: summary,
    });
  } catch (error) {
    console.error("[StreakMark] Fatal error:", error);
    return handleApiError(error, 'StreakMark');
  }
}
