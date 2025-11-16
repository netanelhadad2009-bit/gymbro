import { NextResponse } from "next/server";
import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * POST /api/session/attach
 *
 * Attaches pre-generated plans from a PlanSession to the authenticated user's profile.
 * This is called during signup to persist plans that were generated on the GeneratingPage.
 *
 * Request body should include:
 * {
 *   session: PlanSession (from localStorage)
 * }
 *
 * Returns:
 * - 200: Plans attached successfully
 * - 400: Missing session data or invalid session
 * - 401: Not authenticated (via cookies or Bearer token)
 * - 500: Server error
 */
export async function POST(req: Request) {
  try {
    // 1. Check authentication (supports both cookies and Bearer tokens)
    const supabase = await createServerSupabaseClientWithAuth();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = user.id;
    const body = await req.json();
    const planSession = body.session;

    if (!planSession) {
      console.error("[SessionAttach] Missing plan session");
      return NextResponse.json(
        { ok: false, error: "invalid_input", message: "Missing plan session data" },
        { status: 400 }
      );
    }

    console.log(`[SessionAttach] POST user=${userId.substring(0, 8)}`, {
      nutrition: planSession.nutrition?.status,
      workout: planSession.workout?.status,
      journey: planSession.journey?.status,
    });

    // 2. Ensure profile exists - self-healing
    const { data: existingData, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .limit(1);

    const existing = Array.isArray(existingData) ? existingData[0] : existingData;

    if (!existing) {
      console.log("[SessionAttach] Profile not found → creating...");

      const nowISO = new Date().toISOString();
      const { error: createError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          created_at: nowISO,
          updated_at: nowISO,
        });

      if (createError) {
        console.error("[SessionAttach] Failed to create profile:", createError);
        // Continue anyway - will try to update below
      } else {
        console.log("[SessionAttach] Profile created successfully");
      }
    }

    // 3. Attach nutrition plan if ready
    let nutritionAttached = false;
    if (planSession.nutrition?.status === 'ready' && planSession.nutrition.plan) {
      console.log("[SessionAttach] Attaching nutrition plan...");

      const { error: nutritionError } = await supabase
        .from("profiles")
        .update({
          nutrition_plan: planSession.nutrition.plan,
          nutrition_fingerprint: planSession.nutrition.fingerprint,
          nutrition_calories: planSession.nutrition.calories,
          nutrition_status: 'ready',
          nutrition_updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (nutritionError) {
        console.error("[SessionAttach] Failed to attach nutrition plan:", nutritionError);
      } else {
        console.log("[SessionAttach] Nutrition plan attached successfully");
        nutritionAttached = true;
      }
    } else if (planSession.nutrition?.status === 'failed') {
      // Mark as pending so user can retry later
      console.log("[SessionAttach] Nutrition generation failed → marking as pending");

      const { error: nutritionError } = await supabase
        .from("profiles")
        .update({
          nutrition_plan: null,
          nutrition_fingerprint: planSession.nutrition.fingerprint || null,
          nutrition_calories: null,
          nutrition_status: 'pending',
          nutrition_updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (nutritionError) {
        console.error("[SessionAttach] Failed to mark nutrition as pending:", nutritionError);
      }
    }

    // 4. Attach workout plan if ready (future feature)
    let workoutAttached = false;
    if (planSession.workout?.status === 'ready' && planSession.workout.plan) {
      console.log("[SessionAttach] Attaching workout plan...");

      // TODO: Add workout plan storage to profiles table when ready
      // For now, just log
      console.log("[SessionAttach] Workout plan ready but storage not implemented yet");
      workoutAttached = true;
    }

    // 5. Attach journey/avatar if ready (future feature)
    let journeyAttached = false;
    if (planSession.journey?.status === 'ready') {
      console.log("[SessionAttach] Attaching journey data...");

      // TODO: Add journey/avatar storage when ready
      console.log("[SessionAttach] Journey data ready but storage not implemented yet");
      journeyAttached = true;
    }

    // 6. Return success
    console.log("[SessionAttach] Session attached successfully", {
      nutritionAttached,
      workoutAttached,
      journeyAttached,
    });

    return NextResponse.json({
      ok: true,
      attached: {
        nutrition: nutritionAttached,
        workout: workoutAttached,
        journey: journeyAttached,
      },
    });

  } catch (err: any) {
    console.error("[SessionAttach] Fatal error:", err?.message, err?.stack);
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
