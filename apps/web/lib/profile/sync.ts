/**
 * Profile Sync Layer
 *
 * Handles synchronization between localStorage onboarding data and Supabase profile.
 * Ensures that when a user completes onboarding again (after reinstall, etc.),
 * the new data properly overwrites the old profile in the database.
 */

import { supabase } from "@/lib/supabase";
import { getOnboardingDataOrNull, OnboardingData, saveOnboardingData } from "@/lib/onboarding-storage";

// Keys for sync flags
const ONBOARDING_JUST_COMPLETED_KEY = "fitjourney_onboarding_just_completed";

/**
 * Set the flag indicating onboarding was just completed
 * This flag ensures fresh onboarding data ALWAYS overwrites existing profile
 */
export function setOnboardingJustCompleted(): void {
  try {
    localStorage.setItem(ONBOARDING_JUST_COMPLETED_KEY, "true");
    console.log("[ProfileSync] Set onboarding_just_completed flag");
  } catch (error) {
    console.error("[ProfileSync] Failed to set onboarding_just_completed flag:", error);
  }
}

/**
 * Check if onboarding was just completed
 */
export function wasOnboardingJustCompleted(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_JUST_COMPLETED_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Clear the onboarding just completed flag
 */
export function clearOnboardingJustCompleted(): void {
  try {
    localStorage.removeItem(ONBOARDING_JUST_COMPLETED_KEY);
    console.log("[ProfileSync] Cleared onboarding_just_completed flag");
  } catch (error) {
    console.error("[ProfileSync] Failed to clear onboarding_just_completed flag:", error);
  }
}

/**
 * Normalize goal from various formats to DB format
 */
function normalizeGoal(goal: string | string[] | undefined): string | undefined {
  if (!goal) return undefined;

  const goalStr = Array.isArray(goal) ? goal[0] : goal;
  if (!goalStr) return undefined;

  const lower = goalStr.toLowerCase();

  // Hebrew to English mappings
  if (lower.includes("עלייה") || lower.includes("בניית") || lower.includes("gain") || lower.includes("muscle")) {
    return "gain";
  }
  if (lower.includes("ירידה") || lower.includes("הרזיה") || lower.includes("loss") || lower.includes("lose")) {
    return "loss";
  }
  if (lower.includes("שמירה") || lower.includes("maintain") || lower.includes("recomp")) {
    return "maintain";
  }

  return goalStr;
}

/**
 * Normalize gender from various formats to DB format
 */
function normalizeGender(gender: string | undefined): "male" | "female" | "other" | undefined {
  if (!gender) return undefined;

  const lower = gender.toLowerCase();

  if (lower === "male" || lower === "זכר" || lower === "m") {
    return "male";
  }
  if (lower === "female" || lower === "נקבה" || lower === "f") {
    return "female";
  }
  if (lower === "other" || lower === "אחר") {
    return "other";
  }

  return undefined;
}

/**
 * Normalize diet from various formats to DB format
 */
function normalizeDiet(diet: string | undefined): string | undefined {
  if (!diet) return undefined;

  const lower = diet.toLowerCase();

  if (lower.includes("vegan") || lower.includes("טבעוני")) return "vegan";
  if (lower.includes("vegetarian") || lower.includes("צמחוני")) return "vegetarian";
  if (lower.includes("keto") || lower.includes("קטו")) return "keto";
  if (lower.includes("paleo") || lower.includes("פליאו")) return "paleo";
  if (lower === "none" || lower === "ללא" || lower === "regular" || lower === "רגיל") return "regular";

  return diet;
}

/**
 * Calculate age from birthdate
 */
function calculateAge(birthdate: string): number | undefined {
  try {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 13 && age <= 120 ? age : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Convert onboarding data to profile update payload
 */
function onboardingToProfilePayload(onboarding: OnboardingData): Record<string, any> {
  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
    has_completed_onboarding: true,
  };

  // Map onboarding fields to profile fields
  if (onboarding.gender) {
    payload.gender = normalizeGender(onboarding.gender);
  }

  if (onboarding.height_cm && isFinite(onboarding.height_cm)) {
    payload.height_cm = Math.round(onboarding.height_cm);
  }

  if (onboarding.weight_kg && isFinite(onboarding.weight_kg)) {
    payload.weight_kg = Math.round(onboarding.weight_kg * 10) / 10;
  }

  if (onboarding.target_weight_kg && isFinite(onboarding.target_weight_kg)) {
    payload.target_weight_kg = Math.round(onboarding.target_weight_kg * 10) / 10;
  }

  if (onboarding.birthdate) {
    payload.birthdate = onboarding.birthdate;
    const age = calculateAge(onboarding.birthdate);
    if (age) {
      payload.age = age;
    }
  }

  if (onboarding.goals) {
    payload.goal = normalizeGoal(onboarding.goals);
  }

  if (onboarding.diet) {
    payload.diet = normalizeDiet(onboarding.diet);
  }

  if (onboarding.activity) {
    payload.activity_level = onboarding.activity;
  }

  if (onboarding.training_frequency_actual) {
    // Convert to numeric workout days
    const freqMap: Record<string, number> = {
      "low": 2,
      "medium": 4,
      "high": 6,
    };
    payload.workout_days_per_week = freqMap[onboarding.training_frequency_actual] || 3;
  }

  if (onboarding.experience) {
    payload.experience = onboarding.experience;
  }

  if (onboarding.pace) {
    payload.pace = onboarding.pace;
  }

  // Calculate BMI if we have height and weight
  if (payload.height_cm && payload.weight_kg) {
    const heightM = payload.height_cm / 100;
    payload.bmi = Math.round((payload.weight_kg / (heightM * heightM)) * 10) / 10;
  }

  return payload;
}

export interface SyncResult {
  synced: boolean;
  action: "updated_from_onboarding" | "kept_database" | "no_action" | "error";
  message: string;
}

/**
 * Sync profile data after login
 *
 * This function compares localStorage onboarding data with Supabase profile
 * and updates the database if the local data is newer.
 *
 * @param userId - The user's ID
 * @returns SyncResult indicating what action was taken
 */
export async function syncProfileAfterLogin(userId: string): Promise<SyncResult> {
  console.log("[ProfileSync] ========================================");
  console.log("[ProfileSync] Starting profile sync for user:", userId.slice(0, 8) + "...");

  try {
    // Step 1: Check if onboarding was just completed (priority flag)
    const justCompleted = wasOnboardingJustCompleted();
    console.log("[ProfileSync] Onboarding just completed flag:", justCompleted);

    // Step 2: Get localStorage onboarding data
    const onboardingData = getOnboardingDataOrNull();
    console.log("[ProfileSync] localStorage onboarding data:", {
      hasData: !!onboardingData,
      updatedAt: onboardingData?.updatedAt,
      source: onboardingData?.source,
      hasGender: !!onboardingData?.gender,
      hasHeight: !!onboardingData?.height_cm,
      hasWeight: !!onboardingData?.weight_kg,
      hasGoals: !!(onboardingData?.goals?.length),
    });

    // Step 3: Get Supabase profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[ProfileSync] Error fetching profile:", profileError);
      return {
        synced: false,
        action: "error",
        message: `Failed to fetch profile: ${profileError.message}`,
      };
    }

    console.log("[ProfileSync] Supabase profile:", {
      hasProfile: !!profile,
      updated_at: profile?.updated_at,
      has_completed_onboarding: profile?.has_completed_onboarding,
      age: profile?.age,
      height_cm: profile?.height_cm,
      weight_kg: profile?.weight_kg,
    });

    // Step 4: Determine if we should update
    // Priority 1: If onboarding was just completed, ALWAYS update
    if (justCompleted && onboardingData) {
      console.log("[ProfileSync] 🚀 Onboarding just completed - forcing profile update");

      const payload = onboardingToProfilePayload(onboardingData);
      console.log("[ProfileSync] Update payload:", payload);

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            ...payload,
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("[ProfileSync] ❌ Failed to update profile:", upsertError);
        return {
          synced: false,
          action: "error",
          message: `Failed to update profile: ${upsertError.message}`,
        };
      }

      // Also update user_metadata for consistency
      await supabase.auth.updateUser({
        data: {
          ...payload,
          profile_synced_at: new Date().toISOString(),
        },
      });

      // Clear the flag after successful sync
      clearOnboardingJustCompleted();

      console.log("[ProfileSync] ✅ Profile updated with fresh onboarding data");
      return {
        synced: true,
        action: "updated_from_onboarding",
        message: "Profile updated with fresh onboarding data",
      };
    }

    // Priority 2: Compare timestamps if no just-completed flag
    if (!onboardingData) {
      console.log("[ProfileSync] No localStorage onboarding data, keeping database profile");
      return {
        synced: false,
        action: "no_action",
        message: "No local onboarding data to sync",
      };
    }

    // Check if onboarding data has meaningful content
    const hasOnboardingContent = !!(
      onboardingData.gender ||
      onboardingData.height_cm ||
      onboardingData.weight_kg ||
      onboardingData.goals?.length
    );

    if (!hasOnboardingContent) {
      console.log("[ProfileSync] localStorage onboarding data is incomplete, keeping database profile");
      return {
        synced: false,
        action: "no_action",
        message: "Local onboarding data is incomplete",
      };
    }

    // Compare timestamps
    const localUpdatedAt = onboardingData.updatedAt || 0;
    const dbUpdatedAt = profile?.updated_at ? new Date(profile.updated_at).getTime() : 0;

    console.log("[ProfileSync] Timestamp comparison:", {
      localUpdatedAt: localUpdatedAt ? new Date(localUpdatedAt).toISOString() : "none",
      dbUpdatedAt: dbUpdatedAt ? new Date(dbUpdatedAt).toISOString() : "none",
      localIsNewer: localUpdatedAt > dbUpdatedAt,
    });

    // Only update if local data is newer
    if (localUpdatedAt > dbUpdatedAt) {
      console.log("[ProfileSync] 📝 Local data is newer - updating profile");

      const payload = onboardingToProfilePayload(onboardingData);
      console.log("[ProfileSync] Update payload:", payload);

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            ...payload,
          },
          { onConflict: "id" }
        );

      if (upsertError) {
        console.error("[ProfileSync] ❌ Failed to update profile:", upsertError);
        return {
          synced: false,
          action: "error",
          message: `Failed to update profile: ${upsertError.message}`,
        };
      }

      // Also update user_metadata
      await supabase.auth.updateUser({
        data: {
          ...payload,
          profile_synced_at: new Date().toISOString(),
        },
      });

      console.log("[ProfileSync] ✅ Profile updated with newer onboarding data");
      return {
        synced: true,
        action: "updated_from_onboarding",
        message: "Profile updated with newer onboarding data",
      };
    } else {
      console.log("[ProfileSync] 📋 Database profile is newer, keeping existing data");

      // Optionally update localStorage with DB data to keep in sync
      if (profile) {
        saveOnboardingData({
          gender: profile.gender,
          height_cm: profile.height_cm,
          weight_kg: profile.weight_kg,
          target_weight_kg: profile.target_weight_kg,
          birthdate: profile.birthdate,
          goals: profile.goal ? [profile.goal] : undefined,
          diet: profile.diet,
          activity: profile.activity_level,
          source: "supabase",
          updatedAt: dbUpdatedAt,
        });
      }

      return {
        synced: false,
        action: "kept_database",
        message: "Database profile is newer, kept existing data",
      };
    }
  } catch (error: any) {
    console.error("[ProfileSync] ❌ Unexpected error:", error);
    return {
      synced: false,
      action: "error",
      message: `Unexpected error: ${error.message}`,
    };
  } finally {
    console.log("[ProfileSync] ========================================");
  }
}

/**
 * Force sync profile from localStorage to database
 * Use this when you KNOW the local data should override the database
 */
export async function forceProfileSync(userId: string): Promise<SyncResult> {
  // Set the flag and call normal sync
  setOnboardingJustCompleted();
  return syncProfileAfterLogin(userId);
}
