import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/nutrition/plan
 *
 * Retrieves the user's persisted nutrition plan
 * Does NOT generate - only returns stored plan from attach step
 *
 * Requirements:
 * - User must be authenticated
 *
 * Returns:
 * - 200: Plan data (only when nutrition_plan is non-null)
 * - 401: Not authenticated
 * - 404: No plan found (nutrition_plan is null)
 * - 500: Server error
 */
export async function GET() {
  try {
    // 1. Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log("[Nutrition Plan] GET request for user", userId.substring(0, 8));

    // 2. Retrieve nutrition plan from database
    // Use limit(1) + order to safely get single row without coercion error
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("nutrition_plan, nutrition_fingerprint, nutrition_calories, nutrition_updated_at, nutrition_status")
      .eq("id", userId)
      .order("nutrition_updated_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("[Nutrition Plan] Failed to fetch plan:", fetchError);
      return NextResponse.json(
        { ok: false, error: "database_error", message: fetchError.message },
        { status: 500 }
      );
    }

    // Safely handle array response
    const profile = Array.isArray(data) ? data[0] : data;

    // Return 404 if profile doesn't exist OR nutrition_plan is null
    if (!profile || !profile.nutrition_plan) {
      const status = profile?.nutrition_status || 'unknown';
      console.warn(`[Nutrition Plan] No plan found for user ${userId.substring(0, 8)} (status: ${status})`);

      // If status is 'pending', return different message and include status
      if (status === 'pending') {
        return NextResponse.json(
          {
            ok: false,
            error: "pending",
            status: "pending",
            message: "Your nutrition plan is being generated. Please try again in a moment.",
            fingerprint: profile?.nutrition_fingerprint
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { ok: false, error: "not_found", message: "No nutrition plan found. Complete onboarding first." },
        { status: 404 }
      );
    }

    // Verify plan is an object (not a placeholder)
    if (typeof profile.nutrition_plan !== 'object') {
      console.warn(`[Nutrition Plan] Invalid plan type for user ${userId.substring(0, 8)}: ${typeof profile.nutrition_plan}`);
      return NextResponse.json(
        { ok: false, error: "not_found", message: "No nutrition plan found. Complete onboarding first." },
        { status: 404 }
      );
    }

    console.log("[Nutrition Plan] Plan retrieved successfully");

    return NextResponse.json({
      ok: true,
      plan: profile.nutrition_plan,
      fingerprint: profile.nutrition_fingerprint ?? null,
      calories: profile.nutrition_calories ?? null,
      updatedAt: profile.nutrition_updated_at ?? null,
    });

  } catch (err: any) {
    console.error("[Nutrition Plan] Fatal error:", err?.message, err?.stack);
    return NextResponse.json(
      {
        ok: false,
        error: "server_error",
        message: err?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
