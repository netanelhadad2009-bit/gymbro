import { z } from "zod";

/**
 * Normalized user profile for AI coach
 */
export interface UserProfile {
  age: number | null;
  gender: "male" | "female" | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  bmi: number | null;
  goal: "gain" | "loss" | "maintain" | null;
  diet: "regular" | "vegan" | "vegetarian" | "keto" | "paleo" | null;
  activityLevel: "low" | "moderate" | "high" | null;
  workout_days_per_week: number | null;
  frequency: "low" | "medium" | "high" | null;
  experience: "beginner" | "intermediate" | "advanced" | "knowledge" | "time" | null;
  injuries: string | null;
}

/**
 * Zod schema for profile validation
 */
export const UserProfileSchema = z.object({
  age: z.number().int().min(13).max(120).nullable(),
  gender: z.enum(["male", "female"]).nullable(),
  height_cm: z.number().min(100).max(250).nullable(),
  weight_kg: z.number().min(30).max(300).nullable(),
  target_weight_kg: z.number().min(30).max(300).nullable(),
  bmi: z.number().min(10).max(60).nullable(),
  goal: z.enum(["gain", "loss", "maintain"]).nullable(),
  diet: z.enum(["regular", "vegan", "vegetarian", "keto", "paleo"]).nullable(),
  activityLevel: z.enum(["low", "moderate", "high"]).nullable(),
  workout_days_per_week: z.number().int().min(0).max(7).nullable(),
  frequency: z.enum(["low", "medium", "high"]).nullable(),
  experience: z.enum(["beginner", "intermediate", "advanced", "knowledge", "time"]).nullable(),
  injuries: z.string().nullable(),
});

/**
 * Empty profile with all null values
 */
export const emptyProfile: UserProfile = {
  age: null,
  gender: null,
  height_cm: null,
  weight_kg: null,
  target_weight_kg: null,
  bmi: null,
  goal: null,
  diet: null,
  activityLevel: null,
  workout_days_per_week: null,
  frequency: null,
  experience: null,
  injuries: null,
};

/**
 * Check if profile has critical fields filled
 */
export function hasCompleteProfile(profile: UserProfile): boolean {
  return !!(
    profile.age &&
    profile.gender &&
    profile.height_cm &&
    profile.weight_kg &&
    profile.goal
  );
}

/**
 * Convert profile to compact summary string for display
 */
export function profileToSummaryString(profile: UserProfile): string {
  const parts: string[] = [];

  if (profile.gender) {
    parts.push(profile.gender === "male" ? "♂" : "♀");
  }

  if (profile.age) {
    parts.push(`${profile.age}y`);
  }

  if (profile.height_cm) {
    parts.push(`${profile.height_cm}cm`);
  }

  if (profile.weight_kg) {
    parts.push(`${profile.weight_kg}kg`);
  }

  if (profile.goal) {
    const goalMap = {
      gain: "עלייה",
      loss: "ירידה",
      maintain: "שמירה",
    };
    parts.push(goalMap[profile.goal]);
  }

  if (profile.diet && profile.diet !== "regular") {
    const dietMap = {
      vegan: "טבעוני",
      vegetarian: "צמחוני",
      keto: "קטו",
      paleo: "פליאו",
      regular: "",
    };
    parts.push(dietMap[profile.diet]);
  }

  if (profile.workout_days_per_week) {
    parts.push(`${profile.workout_days_per_week}x/wk`);
  }

  return parts.join(" • ");
}

/**
 * Convert profile to detailed Hebrew string for system prompt
 */
export function profileToSystemString(profile: UserProfile): string {
  const age = profile.age || "לא ידוע";
  const gender = profile.gender === "male" ? "זכר" : profile.gender === "female" ? "נקבה" : "לא ידוע";
  const height = profile.height_cm ? `${profile.height_cm} ס"מ` : "לא ידוע";
  const weight = profile.weight_kg ? `${profile.weight_kg} ק"ג` : "לא ידוע";
  const targetWeight = profile.target_weight_kg ? `${profile.target_weight_kg} ק"ג` : "לא ידוע";
  const bmi = profile.bmi ? profile.bmi.toFixed(1) : "לא ידוע";

  const goalMap = {
    gain: "עלייה במסה",
    loss: "ירידה במשקל",
    maintain: "שמירה על משקל",
  };
  const goal = profile.goal ? goalMap[profile.goal] : "לא ידוע";

  const dietMap = {
    regular: "רגיל",
    vegan: "טבעוני",
    vegetarian: "צמחוני",
    keto: "קטוגני",
    paleo: "פליאו",
  };
  const diet = profile.diet ? dietMap[profile.diet] : "לא ידוע";

  const activityMap = {
    low: "נמוכה",
    moderate: "בינונית",
    high: "גבוהה",
  };
  const activity = profile.activityLevel ? activityMap[profile.activityLevel] : "לא ידוע";

  const frequencyMap = {
    low: "נמוכה",
    medium: "בינונית",
    high: "גבוהה",
  };
  const frequency = profile.frequency ? frequencyMap[profile.frequency] : "לא ידוע";

  const experienceMap = {
    beginner: "מתחיל",
    intermediate: "בינוני",
    advanced: "מתקדם",
    knowledge: "ידע תיאורטי",
    time: "מוגבל בזמן",
  };
  const experience = profile.experience ? experienceMap[profile.experience] : "לא ידוע";

  const workoutDays = profile.workout_days_per_week || "לא ידוע";
  const injuries = profile.injuries?.trim() || "אין";

  return `גיל: ${age}, מין: ${gender}, גובה: ${height}, משקל: ${weight}, יעד משקל: ${targetWeight}, BMI: ${bmi}, יעד: ${goal}, דיאטה: ${diet}, רמת פעילות: ${activity}, תדירות אימון: ${frequency}, ניסיון: ${experience}, אימונים/שבוע: ${workoutDays}, מגבלות/פציעות: ${injuries}`;
}
