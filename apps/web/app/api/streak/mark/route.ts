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
import { createClient } from "@/lib/supabase/server";
import { markTodayDone } from "@/lib/streak";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Parse optional source
    let source = "auto";
    try {
      const body = await request.json();
      if (body.source) {
        source = body.source;
      }
    } catch {
      // No body or invalid JSON - use default
    }

    // Mark today and get updated summary
    const summary = await markTodayDone(user.id, source);

    return NextResponse.json({
      ok: true,
      data: summary,
    });
  } catch (error) {
    console.error("[API] POST /api/streak/mark error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
