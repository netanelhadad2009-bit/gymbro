/**
 * API Route: DELETE /api/account/delete
 * Deletes the current user's account and all associated data
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE() {
  try {
    // 1. Verify authentication with regular client
    const supabase = await createServerSupabaseClient();
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

    // 5. Delete profile data (if exists)
    const { error: profileDelErr } = await admin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileDelErr) {
      console.error("[API] Error deleting profile:", profileDelErr);
      // Don't fail the operation if profile doesn't exist
    }

    // 6. Finally, delete the auth user
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
