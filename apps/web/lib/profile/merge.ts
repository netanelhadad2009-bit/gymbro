/**
 * Single source of truth for merging profile data from all sources
 * Priority: Most recent source based on updatedAt timestamp
 */

import { getOnboardingData, OnboardingData } from "@/lib/onboarding-storage";

export type MergedProfile = {
  gender_he?: string | null;
  age?: number | null;
  birthdate?: string | null;
  height_cm?: number | string | null;
  weight_kg?: number | string | null;
  target_weight_kg?: number | string | null;
  activity_level_he?: string | null;
  goal_he?: string | null;
  diet_type_he?: string | null;
  updatedAt?: number | null;
  source?: string | null;
};

/**
 * Translation maps: English (stored in onboarding) → Hebrew (required by nutrition API)
 */
const GENDER_MAP: Record<string, string> = {
  "male": "זכר",
  "female": "נקבה",
  "other": "אחר",
};

const ACTIVITY_MAP: Record<string, string> = {
  "sedentary": "נמוכה",
  "light": "בינונית",
  "high": "גבוהה",
  "מתחיל": "נמוכה",     // Fallback for Hebrew values
  "בינוני": "בינונית",
  "מתקדם": "גבוהה",
};

const GOAL_MAP: Record<string, string> = {
  "ירידה במשקל": "ירידה במשקל",
  "עלייה במסת שריר": "עלייה במסת שריר",
  "עלייה במשקל": "עלייה במשקל",
  "loss": "ירידה במשקל",
  "muscle": "עלייה במסת שריר",
  "gain": "עלייה במשקל",
};

const DIET_MAP: Record<string, string> = {
  "regular": "רגילה",
  "vegetarian": "צמחונית",
  "vegan": "טבעוני",
  "keto": "קטוגני",
  "paleo": "פליאוליתי",
  "רגילה": "רגילה",     // Fallback for Hebrew values
  "צמחונית": "צמחונית",
  "טבעוני": "טבעוני",
  "קטוגני": "קטוגני",
  "פליאוליתי": "פליאוליתי",
};

/**
 * Calculate age from birthdate string
 */
function calculateAge(birthdate: string | undefined | null): number | null {
  if (!birthdate) return null;

  try {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  } catch {
    return null;
  }
}

/**
 * Translate a value using the provided map, fallback to original if not found
 */
function translate(value: string | undefined | null, map: Record<string, string>): string | null {
  if (!value) return null;
  return map[value] || value; // Return mapped value or original if not in map
}

/**
 * Get merged profile data from all available sources (ASYNC)
 *
 * Priority: Most recent source based on updatedAt timestamp
 * - Supabase user_metadata (if authenticated)
 * - localStorage onboarding data
 *
 * @returns Merged profile with all available fields
 */
export async function getMergedProfile(): Promise<MergedProfile> {
  // Get localStorage onboarding data
  let localData: OnboardingData = {};
  try {
    localData = getOnboardingData();
  } catch (err) {
    console.warn("[Profile] Failed to get localStorage data:", err);
  }

  // Try to get Supabase user_metadata
  let supabaseData: any = {};
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!error && user?.user_metadata) {
      supabaseData = user.user_metadata;
    }
  } catch (err) {
    console.warn("[Profile] Failed to get Supabase data:", err);
  }

  // Determine recency: Check which source has the most recent updatedAt
  const supabaseTimestamp = typeof supabaseData.updatedAt === "number"
    ? supabaseData.updatedAt
    : (supabaseData.updated_at ? new Date(supabaseData.updated_at).getTime() : 0);

  const localTimestamp = typeof localData.updatedAt === "number" ? localData.updatedAt : 0;

  // Choose the most recent source
  const useSupabase = supabaseTimestamp >= localTimestamp;
  const sourceName = useSupabase ? "supabase" : "localStorage";

  if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
    console.log("[Profile Merge] Comparing sources:", {
      supabaseTimestamp: supabaseTimestamp ? new Date(supabaseTimestamp).toLocaleString() : "none",
      localTimestamp: localTimestamp ? new Date(localTimestamp).toLocaleString() : "none",
      usingSource: sourceName,
      supabaseFields: Object.keys(supabaseData),
      localFields: Object.keys(localData),
    });
  }

  // Helper to pick value based on recency
  const pick = (key: string): any => {
    if (useSupabase) {
      return supabaseData[key] ?? (localData as any)[key];
    } else {
      return (localData as any)[key] ?? supabaseData[key];
    }
  };

  // Build merged profile with translations
  const merged: MergedProfile = {
    gender_he: translate(pick("gender_he") || pick("gender"), GENDER_MAP),
    birthdate: pick("birthdate") || null,
    age: null, // Will be calculated below
    height_cm: pick("height_cm") || null,
    weight_kg: pick("weight_kg") || null,
    target_weight_kg: pick("target_weight_kg") || null,
    activity_level_he: translate(pick("activity_level_he") || pick("activity"), ACTIVITY_MAP),
    goal_he: translate(pick("goal_he") || pick("goals")?.[0], GOAL_MAP),
    diet_type_he: translate(pick("diet_type_he") || pick("diet"), DIET_MAP),
    updatedAt: Math.max(supabaseTimestamp, localTimestamp) || null,
    source: sourceName,
  };

  // Calculate age from birthdate if available
  const explicitAge = pick("age");
  if (explicitAge && Number.isFinite(explicitAge)) {
    merged.age = explicitAge;
  } else if (merged.birthdate) {
    merged.age = calculateAge(merged.birthdate);
  }

  if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
    console.log("[Profile] Merged data (async):", {
      source: sourceName,
      updatedAt: merged.updatedAt ? new Date(merged.updatedAt).toLocaleString() : "none",
      merged,
    });
  }

  return merged;
}

/**
 * Synchronous version of getMergedProfile that only uses localStorage
 * Useful for client-side components that don't have access to Supabase client
 */
export function getMergedProfileSync(): MergedProfile {
  let localData: OnboardingData = {};
  try {
    localData = getOnboardingData();
  } catch (err) {
    console.warn("[Profile] Failed to get localStorage data:", err);
  }

  // Translate English values to Hebrew
  const merged: MergedProfile = {
    gender_he: translate(localData.gender, GENDER_MAP),
    birthdate: localData.birthdate || null,
    age: null,
    height_cm: localData.height_cm || null,
    weight_kg: localData.weight_kg || null,
    target_weight_kg: localData.target_weight_kg || null,
    activity_level_he: translate(localData.activity, ACTIVITY_MAP),
    goal_he: translate(localData.goals?.[0], GOAL_MAP),
    diet_type_he: translate(localData.diet, DIET_MAP),
    updatedAt: localData.updatedAt || null,
    source: localData.source || "localStorage",
  };

  // Calculate age from birthdate if available
  if (merged.birthdate) {
    merged.age = calculateAge(merged.birthdate);
  }

  if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
    console.log("[Profile] Merged data (sync):", {
      source: merged.source,
      updatedAt: merged.updatedAt ? new Date(merged.updatedAt).toLocaleString() : "none",
      merged,
    });
  }

  return merged;
}
