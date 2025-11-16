/**
 * Streak Client Helpers
 *
 * Client-side utilities for marking today's activity.
 * Call from nutrition, workout, or weigh-in completion handlers.
 */

/**
 * Mark today as done (idempotent)
 * Call this whenever user completes a qualifying activity
 */
export async function markTodayIfNeeded(source: string = "auto"): Promise<boolean> {
  try {
    const res = await fetch("/api/streak/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });

    const json = await res.json();

    if (!json.ok) {
      console.warn("[StreakClient] Failed to mark today:", json.error);
      return false;
    }

    console.log("[StreakClient] Today marked successfully:", json.data.current);
    return true;
  } catch (error) {
    console.error("[StreakClient] Error marking today:", error);
    return false;
  }
}

/**
 * Mark today from nutrition log
 */
export async function markTodayFromNutrition(): Promise<boolean> {
  return markTodayIfNeeded("nutrition");
}

/**
 * Mark today from workout completion
 */
export async function markTodayFromWorkout(): Promise<boolean> {
  return markTodayIfNeeded("workout");
}

/**
 * Mark today from weigh-in
 */
export async function markTodayFromWeight(): Promise<boolean> {
  return markTodayIfNeeded("weight");
}
