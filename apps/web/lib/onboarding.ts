import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Save the user's desired workouts per week to Supabase
 * Stores in both user metadata and profiles table
 */
export async function saveDesiredWorkoutsPerWeek(
  supabase: SupabaseClient,
  value: number
) {
  // Update user metadata
  const { error: metaErr } = await supabase.auth.updateUser({
    data: { desired_workouts_per_week: value },
  });
  if (metaErr) throw metaErr;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Update profiles table if user exists
  if (user?.id) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ desired_workouts_per_week: value })
      .eq("id", user.id);

    // Don't throw on profile error - metadata is primary source
    if (profileErr) {
      console.warn("Failed to update profile:", profileErr);
    }
  }
}

/**
 * Save the user's diet preference to Supabase
 * Stores in both user metadata and profiles table
 */
export async function saveDietPreference(
  supabase: SupabaseClient,
  diet: string
) {
  // Update user metadata
  const { error: mErr } = await supabase.auth.updateUser({
    data: { diet },
  });
  if (mErr) throw mErr;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Update profiles table if user exists
  if (user?.id) {
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ diet })
      .eq("id", user.id);

    // Don't throw on profile error - metadata is primary source
    if (pErr) {
      console.warn("Failed to update profile:", pErr);
    }
  }
}

/**
 * Save the user's current training frequency to Supabase
 * Stores in both user metadata and profiles table
 */
export async function saveTrainingFrequencyActual(
  supabase: SupabaseClient,
  frequency: "low" | "medium" | "high"
) {
  // Update user metadata
  const { error: metaErr } = await supabase.auth.updateUser({
    data: { training_frequency_actual: frequency },
  });
  if (metaErr) throw metaErr;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Update profiles table if user exists
  if (user?.id) {
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ training_frequency_actual: frequency })
      .eq("id", user.id);

    // Don't throw on profile error - metadata is primary source
    if (profileErr) {
      console.warn("Failed to update profile:", profileErr);
    }
  }
}
