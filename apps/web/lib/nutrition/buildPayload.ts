/**
 * Single source of truth for building nutrition API request payloads
 * Prevents 422 errors by guaranteeing complete, validated requests with proper type coercion
 */

export type NutritionPayload = {
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

// Minimal shape of merged profile source
export type MergedProfile = {
  gender_he?: string | null;
  age?: number | null;
  height_cm?: number | string | null;
  weight_kg?: number | string | null;
  target_weight_kg?: number | string | null;
  activity_level_he?: string | null;
  goal_he?: string | null;
  diet_type_he?: string | null;
};

/**
 * Coerce a value to a valid positive number, or return NaN if invalid
 * Handles strings from UI inputs and ensures we send numbers to the API
 */
export function coerceNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : NaN;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return NaN;
    const num = Number(trimmed);
    return Number.isFinite(num) && num > 0 ? num : NaN;
  }
  return NaN;
}

/**
 * Coerce a value to a valid string, or return empty string if invalid
 */
function coerceString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

/**
 * Build a complete, validated nutrition request payload with type coercion
 *
 * @param profile - Merged profile data from all sources (UI store, Supabase, localStorage)
 * @param override - Explicit overrides (e.g., force days or specific values)
 * @returns { payload, missing } where missing is an array of field names that are invalid/missing
 */
export function buildNutritionPayload(
  profile: MergedProfile | null,
  override?: Partial<NutritionPayload>
): { payload: NutritionPayload; missing: string[] } {
  // Build payload with type coercion
  const payload: NutritionPayload = {
    gender_he: coerceString(profile?.gender_he),
    age: coerceNumber(profile?.age),
    height_cm: coerceNumber(profile?.height_cm),
    weight_kg: coerceNumber(profile?.weight_kg),
    target_weight_kg: coerceNumber(profile?.target_weight_kg),
    activity_level_he: coerceString(profile?.activity_level_he),
    goal_he: coerceString(profile?.goal_he),
    diet_type_he: coerceString(profile?.diet_type_he) || "רגילה", // Default to regular diet
    days: 7, // Default to 7 days
  };

  // Apply explicit overrides (e.g., from UI inputs)
  if (override) {
    Object.assign(payload, override);
  }

  // Validate and collect missing fields
  const missing: string[] = [];

  if (!payload.gender_he || payload.gender_he.length === 0) {
    missing.push("gender_he");
  }
  if (!Number.isFinite(payload.age) || payload.age <= 0) {
    missing.push("age");
  }
  if (!Number.isFinite(payload.height_cm) || payload.height_cm <= 0) {
    missing.push("height_cm");
  }
  if (!Number.isFinite(payload.weight_kg) || payload.weight_kg <= 0) {
    missing.push("weight_kg");
  }
  if (!Number.isFinite(payload.target_weight_kg) || payload.target_weight_kg <= 0) {
    missing.push("target_weight_kg");
  }
  if (!payload.activity_level_he || payload.activity_level_he.length === 0) {
    missing.push("activity_level_he");
  }
  if (!payload.goal_he || payload.goal_he.length === 0) {
    missing.push("goal_he");
  }
  if (!payload.diet_type_he || payload.diet_type_he.length === 0) {
    missing.push("diet_type_he");
  }
  if (!Number.isInteger(payload.days) || payload.days < 1 || payload.days > 14) {
    missing.push("days");
  }

  return { payload, missing };
}
