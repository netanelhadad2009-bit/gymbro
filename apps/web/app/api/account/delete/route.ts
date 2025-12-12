/**
 * API Route: DELETE /api/account/delete
 * Deletes the current user's account and all associated data
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClientWithAuth } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    // 1. Verify authentication (supports both cookie-based and Bearer token auth)
    const supabase = await createServerSupabaseClientWithAuth();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 2. Create admin client with service role for cross-RLS operations
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 3. Get all program IDs for this user
    const { data: programs, error: pErr } = await admin
      .from("programs")
      .select("id")
      .eq("user_id", userId);

    if (pErr) {
      console.error("[API] Error fetching programs:", pErr);
      return NextResponse.json(
        { ok: false, error: pErr.message },
        { status: 500 }
      );
    }

    const programIds = (programs ?? []).map((p) => p.id);

    // 4. Delete all user data in correct order (respecting FK constraints)
    if (programIds.length > 0) {
      // 4a. Get all workout IDs from these programs
      const { data: workouts, error: wErr } = await admin
        .from("workouts")
        .select("id")
        .in("program_id", programIds);

      if (wErr) {
        console.error("[API] Error fetching workouts:", wErr);
        return NextResponse.json(
          { ok: false, error: wErr.message },
          { status: 500 }
        );
      }

      const workoutIds = (workouts ?? []).map((w) => w.id);

      // 4b. Delete workout_exercises
      if (workoutIds.length > 0) {
        const { error: weDelErr } = await admin
          .from("workout_exercises")
          .delete()
          .in("workout_id", workoutIds);

        if (weDelErr) {
          console.error("[API] Error deleting workout_exercises:", weDelErr);
          return NextResponse.json(
            { ok: false, error: weDelErr.message },
            { status: 500 }
          );
        }
      }

      // 4c. Delete workouts
      const { error: wDelErr } = await admin
        .from("workouts")
        .delete()
        .in("program_id", programIds);

      if (wDelErr) {
        console.error("[API] Error deleting workouts:", wDelErr);
        return NextResponse.json(
          { ok: false, error: wDelErr.message },
          { status: 500 }
        );
      }

      // 4d. Delete nutrition_plans
      const { error: nDelErr } = await admin
        .from("nutrition_plans")
        .delete()
        .in("program_id", programIds);

      if (nDelErr) {
        console.error("[API] Error deleting nutrition_plans:", nDelErr);
        return NextResponse.json(
          { ok: false, error: nDelErr.message },
          { status: 500 }
        );
      }

      // 4e. Delete programs
      const { error: pDelErr } = await admin
        .from("programs")
        .delete()
        .eq("user_id", userId);

      if (pDelErr) {
        console.error("[API] Error deleting programs:", pDelErr);
        return NextResponse.json(
          { ok: false, error: pDelErr.message },
          { status: 500 }
        );
      }
    }

    // 5. Delete journey stages data
    // 5a. Get all user stage IDs
    const { data: userStages, error: usErr } = await admin
      .from("user_stages")
      .select("id")
      .eq("user_id", userId);

    if (usErr) {
      console.error("[API] Error fetching user_stages:", usErr);
      // Continue anyway
    }

    const userStageIds = (userStages ?? []).map((s) => s.id);

    // 5b. Delete user_stage_tasks
    if (userStageIds.length > 0) {
      const { error: ustDelErr } = await admin
        .from("user_stage_tasks")
        .delete()
        .in("user_stage_id", userStageIds);

      if (ustDelErr) {
        console.error("[API] Error deleting user_stage_tasks:", ustDelErr);
        // Continue anyway
      }
    }

    // 5c. Delete user_stages
    const { error: usDelErr } = await admin
      .from("user_stages")
      .delete()
      .eq("user_id", userId);

    if (usDelErr) {
      console.error("[API] Error deleting user_stages:", usDelErr);
      // Continue anyway
    }

    // 6. Delete meals and related data
    // 6a. Get all meal IDs
    const { data: meals, error: mealsErr } = await admin
      .from("meals")
      .select("id")
      .eq("user_id", userId);

    if (mealsErr) {
      console.error("[API] Error fetching meals:", mealsErr);
      // Continue anyway
    }

    const mealIds = (meals ?? []).map((m) => m.id);

    // 6b. Delete meal_foods
    if (mealIds.length > 0) {
      const { error: mfDelErr } = await admin
        .from("meal_foods")
        .delete()
        .in("meal_id", mealIds);

      if (mfDelErr) {
        console.error("[API] Error deleting meal_foods:", mfDelErr);
        // Continue anyway
      }
    }

    // 6c. Delete meals
    const { error: mealsDelErr } = await admin
      .from("meals")
      .delete()
      .eq("user_id", userId);

    if (mealsDelErr) {
      console.error("[API] Error deleting meals:", mealsDelErr);
      // Continue anyway
    }

    // 7. Delete weight logs
    const { error: weightLogsDelErr } = await admin
      .from("weight_logs")
      .delete()
      .eq("user_id", userId);

    if (weightLogsDelErr) {
      console.error("[API] Error deleting weight_logs:", weightLogsDelErr);
      // Continue anyway
    }

    // 8. Delete avatars
    const { error: avatarDelErr } = await admin
      .from("avatars")
      .delete()
      .eq("user_id", userId);

    if (avatarDelErr) {
      console.error("[API] Error deleting avatars:", avatarDelErr);
      // Continue anyway
    }

    // 9. Delete profile data (if exists)
    const { error: profileDelErr } = await admin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDelErr) {
      console.error("[API] Error deleting profile:", profileDelErr);
      // Don't fail the operation if profile doesn't exist
    }

    // 10. Finally, delete the auth user
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);

    if (authErr) {
      console.error("[API] Error deleting auth user:", authErr);
      return NextResponse.json(
        { ok: false, error: authErr.message },
        { status: 500 }
      );
    }

    console.log(`[API] Successfully deleted user account: ${userId}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[API] Unexpected error during account deletion:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
