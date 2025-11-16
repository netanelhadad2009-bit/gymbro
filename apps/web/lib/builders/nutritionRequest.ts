/**
 * Single source of truth for building nutrition API request payloads
 * Prevents 422 errors by guaranteeing complete, validated requests
 */

export type NutritionRequest = {
  gender_he: string;           // "זכר" | "נקבה"
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity_level_he: string;   // e.g. "נמוכה" | "בינונית" | "גבוהה"
  goal_he: string;             // "ירידה במשקל" | "עלייה במסת שריר" | ...
  diet_type_he: string;        // "רגילה" | "טבעוני" | "צמחוני" | "קטוגני" | "פליאוליתי"
  days: number;                // 1..14
};

// Minimal shape of sources we read from
type OnboardingStore = Partial<{
  gender: string;
  birthdate: string;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity: string;
  goals: string[];
  diet: string;
}>;

type Profile = Partial<{
  gender_he: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity_level_he: string;
  goal_he: string;
  diet_type_he: string;
}>;

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const isStr = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

/**
 * Calculate age from birthdate string
 */
function calculateAge(birthdate: string | undefined): number {
  if (!birthdate) return NaN;

  try {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : NaN;
  } catch {
    return NaN;
  }
}

/**
 * Build a complete, validated nutrition request payload
 *
 * @param profile - User profile from database (preferred source)
 * @param onboarding - Onboarding data from localStorage (fallback)
 * @param override - Explicit overrides (e.g., force days or specific values)
 * @returns Complete NutritionRequest
 * @throws Error with code "CLIENT_MISSING_FIELDS" if any required field is missing
 */
export function buildNutritionRequest(
  profile: Profile | null,
  onboarding: OnboardingStore | null,
  override?: Partial<NutritionRequest>
): NutritionRequest {
  // Calculate age from birthdate if not in profile
  const age = profile?.age ?? calculateAge(onboarding?.birthdate);

  // Prefer explicit Hebrew profile fields, then onboarding fallback
  const body: NutritionRequest = {
    gender_he:        profile?.gender_he ?? onboarding?.gender ?? "",
    age:              age,
    height_cm:        profile?.height_cm ?? onboarding?.height_cm ?? NaN,
    weight_kg:        profile?.weight_kg ?? onboarding?.weight_kg ?? NaN,
    target_weight_kg: profile?.target_weight_kg ?? onboarding?.target_weight_kg ?? NaN,
    activity_level_he: profile?.activity_level_he ?? onboarding?.activity ?? "",
    goal_he:           profile?.goal_he ?? onboarding?.goals?.[0] ?? "",
    diet_type_he:      profile?.diet_type_he ?? onboarding?.diet ?? "רגילה",
    days:              7, // Default to 7 days
  };

  // Apply explicit overrides (e.g., force-refresh or UI edits)
  if (override) {
    Object.assign(body, override);
  }

  // Runtime guard - fail fast on the client with clear log
  const missing: string[] = [];
  const issues: Record<string, any> = {};

  if (!isStr(body.gender_he)) {
    missing.push("gender_he");
    issues.gender_he = { value: body.gender_he, profile: profile?.gender_he, onboarding: onboarding?.gender };
  }
  if (!isNum(body.age)) {
    missing.push("age");
    issues.age = { value: body.age, profile: profile?.age, onboarding: onboarding?.birthdate };
  }
  if (!isNum(body.height_cm)) {
    missing.push("height_cm");
    issues.height_cm = { value: body.height_cm, profile: profile?.height_cm, onboarding: onboarding?.height_cm };
  }
  if (!isNum(body.weight_kg)) {
    missing.push("weight_kg");
    issues.weight_kg = { value: body.weight_kg, profile: profile?.weight_kg, onboarding: onboarding?.weight_kg };
  }
  if (!isNum(body.target_weight_kg)) {
    missing.push("target_weight_kg");
    issues.target_weight_kg = { value: body.target_weight_kg, profile: profile?.target_weight_kg, onboarding: onboarding?.target_weight_kg };
  }
  if (!isStr(body.activity_level_he)) {
    missing.push("activity_level_he");
    issues.activity_level_he = { value: body.activity_level_he, profile: profile?.activity_level_he, onboarding: onboarding?.activity };
  }
  if (!isStr(body.goal_he)) {
    missing.push("goal_he");
    issues.goal_he = { value: body.goal_he, profile: profile?.goal_he, onboarding: onboarding?.goals };
  }
  if (!isStr(body.diet_type_he)) {
    missing.push("diet_type_he");
    issues.diet_type_he = { value: body.diet_type_he, profile: profile?.diet_type_he, onboarding: onboarding?.diet };
  }
  if (!Number.isInteger(body.days) || body.days < 1 || body.days > 14) {
    missing.push("days");
    issues.days = { value: body.days };
  }

  if (missing.length) {
    // Developer-friendly console so we immediately see which source is empty
    console.error("[Nutrition] Missing fields before POST:", {
      missing,
      issues,
      profile,
      onboarding,
      bodyPreview: body,
    });

    const err = new Error(
      `Missing required fields for nutrition plan: ${missing.join(", ")}\n` +
      `Please complete your profile in the onboarding flow.`
    );
    // @ts-ignore – attach marker for UI
    err.code = "CLIENT_MISSING_FIELDS";
    // @ts-ignore
    err.missing = missing;
    // @ts-ignore
    err.issues = issues;
    throw err;
  }

  return body;
}

/**
 * Validate a nutrition request payload without throwing
 * Useful for checking if we have enough data before attempting to build
 */
export function canBuildNutritionRequest(
  profile: Profile | null,
  onboarding: OnboardingStore | null
): { valid: boolean; missing?: string[] } {
  try {
    buildNutritionRequest(profile, onboarding);
    return { valid: true };
  } catch (err: any) {
    if (err.code === "CLIENT_MISSING_FIELDS") {
      return { valid: false, missing: err.missing };
    }
    throw err;
  }
}
