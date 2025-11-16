import { createServerSupabaseClient, supabaseServer } from "@/lib/supabase-server";
import { UserProfile, UserProfileSchema, emptyProfile } from "./types";
import { normalizeFrequency, normalizeExperience } from "@/lib/persona/normalize";
import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cache entry with expiry
 */
interface CacheEntry {
  profile: UserProfile;
  timestamp: number;
  fingerprint: string;
}

/**
 * In-memory cache for profiles (5 minute TTL)
 */
const profileCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a stable fingerprint hash for a profile
 */
export function profileFingerprint(profile: UserProfile): string {
  // Sort keys and stringify for stable hash
  const sorted = Object.keys(profile)
    .sort()
    .reduce((acc, key) => {
      acc[key] = profile[key as keyof UserProfile];
      return acc;
    }, {} as any);

  const json = JSON.stringify(sorted);
  return crypto.createHash("md5").update(json).digest("hex");
}

/**
 * Normalize raw data to UserProfile
 */
function normalizeProfile(raw: any): UserProfile {
  const profile: UserProfile = { ...emptyProfile };

  // Age
  if (raw.age && isFinite(raw.age)) {
    profile.age = Math.round(raw.age);
  } else if (raw.date_of_birth || raw.birthdate) {
    const birthDate = new Date(raw.date_of_birth || raw.birthdate);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    if (age >= 13 && age <= 120) {
      profile.age = age;
    }
  }

  // Gender
  const genderRaw = (raw.gender || raw.gender_he || "").toString().toLowerCase();
  if (genderRaw.includes("זכר") || genderRaw === "male" || genderRaw === "m") {
    profile.gender = "male";
  } else if (genderRaw.includes("נקבה") || genderRaw === "female" || genderRaw === "f") {
    profile.gender = "female";
  }

  // Height
  if (raw.height_cm && isFinite(raw.height_cm)) {
    profile.height_cm = Math.round(raw.height_cm);
  } else if (raw.height && isFinite(raw.height)) {
    profile.height_cm = Math.round(raw.height);
  }

  // Weight
  if (raw.weight_kg && isFinite(raw.weight_kg)) {
    profile.weight_kg = Math.round(raw.weight_kg * 10) / 10;
  } else if (raw.weight && isFinite(raw.weight)) {
    profile.weight_kg = Math.round(raw.weight * 10) / 10;
  }

  // Target weight
  if (raw.target_weight_kg && isFinite(raw.target_weight_kg)) {
    profile.target_weight_kg = Math.round(raw.target_weight_kg * 10) / 10;
  } else if (raw.target_weight && isFinite(raw.target_weight)) {
    profile.target_weight_kg = Math.round(raw.target_weight * 10) / 10;
  }

  // Goal
  const goalRaw = (raw.goal || raw.goal_he || "").toString().toLowerCase();
  if (goalRaw.includes("gain") || goalRaw.includes("עלי") || goalRaw.includes("בניית")) {
    profile.goal = "gain";
  } else if (goalRaw.includes("loss") || goalRaw.includes("ירידה") || goalRaw.includes("הרזיה")) {
    profile.goal = "loss";
  } else if (goalRaw.includes("maintain") || goalRaw.includes("שמירה") || goalRaw.includes("שמור")) {
    profile.goal = "maintain";
  }

  // Diet
  const dietRaw = (raw.diet_type || raw.diet_type_he || raw.diet || "").toString().toLowerCase();
  if (dietRaw.includes("vegan") || dietRaw.includes("טבעוני")) {
    profile.diet = "vegan";
  } else if (dietRaw.includes("vegetarian") || dietRaw.includes("צמחוני")) {
    profile.diet = "vegetarian";
  } else if (dietRaw.includes("keto") || dietRaw.includes("קטו")) {
    profile.diet = "keto";
  } else if (dietRaw.includes("paleo") || dietRaw.includes("פליאו")) {
    profile.diet = "paleo";
  } else if (dietRaw) {
    profile.diet = "regular";
  }

  // Activity level
  const activityRaw = (raw.activity_level || raw.activity_level_he || "").toString().toLowerCase();
  if (activityRaw.includes("low") || activityRaw.includes("נמוך")) {
    profile.activityLevel = "low";
  } else if (activityRaw.includes("moderate") || activityRaw.includes("בינוני")) {
    profile.activityLevel = "moderate";
  } else if (activityRaw.includes("high") || activityRaw.includes("גבוה") || activityRaw.includes("אתלטי")) {
    profile.activityLevel = "high";
  }

  // Workout days
  if (raw.workout_days_per_week && isFinite(raw.workout_days_per_week)) {
    profile.workout_days_per_week = Math.min(7, Math.max(0, Math.round(raw.workout_days_per_week)));
  } else if (raw.workout_days && isFinite(raw.workout_days)) {
    profile.workout_days_per_week = Math.min(7, Math.max(0, Math.round(raw.workout_days)));
  }

  // Injuries
  if (raw.injuries && typeof raw.injuries === "string") {
    profile.injuries = raw.injuries.trim();
  } else if (raw.limitations && typeof raw.limitations === "string") {
    profile.injuries = raw.limitations.trim();
  }

  // Frequency (from avatars or profiles)
  if (raw.frequency || raw.training_frequency_actual) {
    profile.frequency = normalizeFrequency(raw.frequency || raw.training_frequency_actual);
  }

  // Experience (from avatars or profiles)
  if (raw.experience) {
    profile.experience = normalizeExperience(raw.experience);
  }

  // Calculate BMI if not present but have height and weight
  if (!raw.bmi && profile.height_cm && profile.weight_kg) {
    const heightInMeters = profile.height_cm / 100;
    profile.bmi = Math.round((profile.weight_kg / Math.pow(heightInMeters, 2)) * 10) / 10;
  } else if (raw.bmi && isFinite(raw.bmi)) {
    profile.bmi = Math.round(raw.bmi * 10) / 10;
  }

  // Validate with Zod
  try {
    return UserProfileSchema.parse(profile);
  } catch (error) {
    console.error("[Profile] Validation error:", error);
    return profile; // Return as-is if validation fails
  }
}

/**
 * Fetch user profile from Supabase (server-side, async version)
 * Merges data from profiles table, avatars table, and user_metadata
 */
export async function getUserProfileServer(userId: string): Promise<UserProfile> {
  try {
    const supabase = await createServerSupabaseClient();

    // Fetch from profiles table and avatars table in parallel
    const [
      { data: profileData, error: profileError },
      { data: avatarData, error: avatarError },
      { data: { user }, error: userError }
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("avatars")
        .select("gender, goal, diet, frequency, experience")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.auth.getUser()
    ]);

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[Profile] Database error:", profileError);
    }

    if (avatarError && avatarError.code !== "PGRST116") {
      console.error("[Profile] Avatar fetch error:", avatarError);
    }

    if (userError) {
      console.error("[Profile] Auth error:", userError);
    }

    // Merge data (profile table takes priority, then avatars, then metadata)
    const merged = {
      ...user?.user_metadata,
      ...avatarData,
      ...profileData,
    };

    return normalizeProfile(merged);
  } catch (error) {
    console.error("[Profile] Fetch error:", error);
    return emptyProfile;
  }
}

/**
 * Fetch user profile using synchronous client (for API routes)
 * Merges data from profiles table, avatars table, and user_metadata
 */
export async function getUserProfileSync(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile> {
  try {
    // Fetch from profiles table and avatars table in parallel
    const [
      { data: profileData, error: profileError },
      { data: avatarData, error: avatarError },
      { data: { user }, error: userError }
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("avatars")
        .select("gender, goal, diet, frequency, experience")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase.auth.getUser()
    ]);

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[Profile] Database error:", profileError);
    }

    if (avatarError && avatarError.code !== "PGRST116") {
      console.error("[Profile] Avatar fetch error:", avatarError);
    }

    if (userError) {
      console.error("[Profile] Auth error:", userError);
    }

    // Merge data (profile table takes priority, then avatars, then metadata)
    const merged = {
      ...user?.user_metadata,
      ...avatarData,
      ...profileData,
    };

    return normalizeProfile(merged);
  } catch (error) {
    console.error("[Profile] Fetch error:", error);
    return emptyProfile;
  }
}

/**
 * Get cached profile or fetch if expired
 */
export async function getCachedProfile(userId: string): Promise<UserProfile> {
  const now = Date.now();
  const cached = profileCache.get(userId);

  // Return cached if still valid
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    if (process.env.NEXT_PUBLIC_LOG_CHAT === "1") {
      console.log(`[Profile] Cache HIT for ${userId}, fingerprint: ${cached.fingerprint}`);
    }
    return cached.profile;
  }

  // Fetch fresh profile
  if (process.env.NEXT_PUBLIC_LOG_CHAT === "1") {
    console.log(`[Profile] Cache MISS for ${userId}, fetching...`);
  }

  const profile = await getUserProfileServer(userId);
  const fingerprint = profileFingerprint(profile);

  // Update cache
  profileCache.set(userId, {
    profile,
    timestamp: now,
    fingerprint,
  });

  // Clean old entries (simple LRU approximation)
  if (profileCache.size > 100) {
    const oldestKey = Array.from(profileCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
    profileCache.delete(oldestKey);
  }

  return profile;
}

/**
 * Clear profile cache for a user (useful after profile update)
 */
export function clearProfileCache(userId: string): void {
  profileCache.delete(userId);
}
