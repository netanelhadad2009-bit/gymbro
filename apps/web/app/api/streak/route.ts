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

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStreakSummary } from "@/lib/streak";

export async function GET() {
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

    // Get streak summary
    const summary = await getStreakSummary(user.id);

    return NextResponse.json({
      ok: true,
      data: summary,
    });
  } catch (error) {
    console.error("[API] GET /api/streak error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
