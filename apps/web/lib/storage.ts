/**
 * User-scoped storage layer to prevent cross-user data leakage.
 * All keys include userId to ensure data isolation.
 */

import { supabase } from "@/lib/supabase";

// Storage key migration from gymbro to fitjourney
// Legacy keys will be read and migrated lazily on first access
// TODO: Remove legacy support after full user migration (target: 2 months)
const NEW_PREFIX = "fitjourney";
const LEGACY_PREFIX = "gymbro";
const PREFIX = NEW_PREFIX; // Default to new prefix

// Helper to get value with migration
function getWithMigration(key: string): string | null {
  if (typeof window === "undefined") return null;

  // Try new key first
  const newValue = localStorage.getItem(key);
  if (newValue !== null) return newValue;

  // Try legacy key
  const legacyKey = key.replace(NEW_PREFIX, LEGACY_PREFIX);
  const legacyValue = localStorage.getItem(legacyKey);
  if (legacyValue !== null) {
    // Migrate to new key
    localStorage.setItem(key, legacyValue);
    localStorage.removeItem(legacyKey);
    console.log(`[storage] Migrated ${legacyKey} → ${key}`);
    return legacyValue;
  }

  return null;
}

const DEVICE_ID_KEY = `${PREFIX}:deviceId`;

/**
 * Nutrition profile for cache fingerprinting
 */
export type NutritionProfile = {
  gender_he?: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  target_weight_kg?: number;
  activity_level_he?: string;
  goal_he?: string;
  diet_type_he?: string;
  days?: number;
};

/**
 * Generate or retrieve a stable device ID for guest users
 * Exported for use by PlanSession
 */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";

  let deviceId = getWithMigration(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get current user ID from Supabase auth, or return guest ID
 */
export async function getCurrentUserId(): Promise<string> {
  if (typeof window === "undefined") return "server";

  const { data: { user } } = await supabase.auth.getUser();

  if (user?.id) {
    return user.id;
  }

  // Return stable guest ID
  return `guest-${getDeviceId()}`;
}

/**
 * Synchronous version - uses cached session
 */
export function getCurrentUserIdSync(): string {
  if (typeof window === "undefined") return "server";

  // Try to get from cached session
  const cachedSession = localStorage.getItem("sb-supabase-auth-token");
  if (cachedSession) {
    try {
      const parsed = JSON.parse(cachedSession);
      if (parsed?.user?.id) {
        return parsed.user.id;
      }
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Return stable guest ID
  return `guest-${getDeviceId()}`;
}

/**
 * Create a scoped storage key
 */
function key(userId: string, name: string): string {
  return `${PREFIX}:${name}:${userId}`;
}

/**
 * Get JSON data for a specific user and key
 */
export function getJson<T>(userId: string, name: string): T | null {
  if (typeof window === "undefined") return null;

  try {
    const storageKey = key(userId, name);
    const data = getWithMigration(storageKey);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error(`[storage] Failed to get ${name} for user ${userId}:`, e);
    return null;
  }
}

/**
 * Set JSON data for a specific user and key
 */
export function setJson<T>(userId: string, name: string, value: T): void {
  if (typeof window === "undefined") return;

  try {
    const storageKey = key(userId, name);
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (e) {
    console.error(`[storage] Failed to set ${name} for user ${userId}:`, e);
  }
}

/**
 * Remove data for a specific user and key
 */
export function remove(userId: string, name: string): void {
  if (typeof window === "undefined") return;

  try {
    const storageKey = key(userId, name);
    localStorage.removeItem(storageKey);
  } catch (e) {
    console.error(`[storage] Failed to remove ${name} for user ${userId}:`, e);
  }
}

/**
 * Clear all fitjourney/gymbro-prefixed keys from storage
 */
export function clearAll(): void {
  if (typeof window === "undefined") return;

  try {
    // Clear both new and legacy prefixed keys
    const keysToRemove = Object.keys(localStorage).filter(k =>
      k.startsWith(NEW_PREFIX + ":") || k.startsWith(LEGACY_PREFIX + ":")
    );
    keysToRemove.forEach(k => localStorage.removeItem(k));
    console.info(`[storage] Cleared ${keysToRemove.length} keys`);
  } catch (e) {
    console.error("[storage] Failed to clear all:", e);
  }
}

/**
 * Migrate guest data to authenticated user
 */
export function migrateGuestCache(newUserId: string): void {
  if (typeof window === "undefined") return;

  const guestId = `guest-${getDeviceId()}`;
  const guestKeys = Object.keys(localStorage).filter(k => k.includes(`:${guestId}`));

  if (guestKeys.length === 0) {
    console.info("[storage] No guest data to migrate");
    return;
  }

  console.info(`[storage] Migrating ${guestKeys.length} guest keys to user ${newUserId}`);

  guestKeys.forEach(guestKey => {
    try {
      // Extract the name from the guest key
      const parts = guestKey.split(":");
      if (parts.length === 3 && parts[0] === PREFIX) {
        const name = parts[1];
        const data = localStorage.getItem(guestKey);

        if (data) {
          // Write to new user key
          const newKey = key(newUserId, name);
          localStorage.setItem(newKey, data);
          console.info(`[storage] Migrated ${name} from guest to user`);
        }
      }

      // Remove guest key
      localStorage.removeItem(guestKey);
    } catch (e) {
      console.error(`[storage] Failed to migrate ${guestKey}:`, e);
    }
  });
}

/**
 * Clean up legacy unscoped keys
 */
export function cleanLegacyKeys(): void {
  if (typeof window === "undefined") return;

  const legacyKeys = [
    "nutritionPlan",
    "workoutProgram",
    "nutrition:eatenMeals",
  ];

  // Also check for date-based keys
  const datePattern = /^nutrition:\d{4}-\d{2}-\d{2}$/;

  legacyKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.info(`[storage] Removing legacy key: ${key}`);
      localStorage.removeItem(key);
    }
  });

  // Clean date-based keys
  Object.keys(localStorage).forEach(key => {
    if (datePattern.test(key)) {
      console.info(`[storage] Removing legacy date key: ${key}`);
      localStorage.removeItem(key);
    }
  });
}

/**
 * Debug helper - log all fitjourney/gymbro keys
 */
export function debugKeys(): void {
  if (typeof window === "undefined") return;

  const keys = Object.keys(localStorage).filter(k =>
    k.startsWith(NEW_PREFIX + ":") || k.startsWith(LEGACY_PREFIX + ":")
  );
  console.info(`[storage] Current keys (${keys.length}):`, keys);
}

/**
 * Create a stable, normalized fingerprint from a nutrition profile
 * Changes to any of these fields will result in a different cache key
 */
export function profileFingerprint(p: NutritionProfile): string {
  // Normalize all inputs to ensure consistent fingerprints
  const normalized = {
    gender: (p.gender_he || "").trim().toLowerCase(),
    age: Math.round(p.age || 0),
    height: Math.round(p.height_cm || 0),
    weight: Math.round(p.weight_kg || 0),
    targetWeight: Math.round(p.target_weight_kg || 0),
    activity: (p.activity_level_he || "").trim().toLowerCase(),
    goal: (p.goal_he || "").trim().toLowerCase(),
    diet: (p.diet_type_he || "").trim().toLowerCase(),
    days: Math.round(p.days || 7),
  };

  // Create a stable JSON string (keys are already in consistent order)
  const fingerprintString = JSON.stringify(normalized);

  // Hash it to a short stable identifier
  return hashFingerprint(fingerprintString);
}

/**
 * Simple hash function for fingerprints (client-safe, no crypto module needed)
 * Creates a short, stable hash from an input string
 */
export function hashFingerprint(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Convert to base36 for a short, readable string
  const hashStr = Math.abs(hash).toString(36);

  // Pad to ensure consistent length (at least 8 chars)
  return hashStr.padStart(8, '0').slice(0, 12);
}

/**
 * Create a nutrition cache key that includes userId and profile fingerprint
 * This ensures different users or different profiles get different cache entries
 */
export function makeNutritionKey(userId: string, profile: NutritionProfile): string {
  const fingerprint = profileFingerprint(profile);
  return `${PREFIX}:nutritionPlan:${userId}:${fingerprint}`;
}

/**
 * Get nutrition plan from cache with optional TTL check
 * Returns null if not found or expired
 */
export function getNutritionPlan(
  userId: string,
  profile: NutritionProfile,
  ttlDays: number = 7
): { plan: any; cachedAt: string; fingerprint: string } | null {
  if (typeof window === "undefined") return null;

  try {
    const cacheKey = makeNutritionKey(userId, profile);
    const cached = getWithMigration(cacheKey);

    if (!cached) {
      if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
        console.log("[storage] Nutrition plan cache MISS", { userId, fingerprint: profileFingerprint(profile) });
      }
      return null;
    }

    const parsed = JSON.parse(cached);

    // Check TTL if cachedAt is present
    if (parsed.cachedAt && ttlDays > 0) {
      const cachedDate = new Date(parsed.cachedAt);
      const now = new Date();
      const daysSinceCached = (now.getTime() - cachedDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCached > ttlDays) {
        if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
          console.log("[storage] Nutrition plan cache EXPIRED", {
            userId,
            fingerprint: profileFingerprint(profile),
            daysSinceCached: Math.round(daysSinceCached),
            ttlDays,
          });
        }
        return null;
      }
    }

    if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
      console.log("[storage] Nutrition plan cache HIT", {
        userId,
        fingerprint: profileFingerprint(profile),
        cachedFingerprint: parsed.fingerprint,
        cachedAt: parsed.cachedAt,
      });
    }

    return parsed;
  } catch (e) {
    console.error("[storage] Failed to get nutrition plan:", e);
    return null;
  }
}

/**
 * Save nutrition plan to cache with timestamp
 */
export function setNutritionPlan(
  userId: string,
  profile: NutritionProfile,
  plan: any
): void {
  if (typeof window === "undefined") return;

  try {
    const cacheKey = makeNutritionKey(userId, profile);
    const cacheData = {
      plan,
      cachedAt: new Date().toISOString(),
      fingerprint: profileFingerprint(profile),
    };

    localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
      console.log("[storage] Nutrition plan cached", {
        userId,
        fingerprint: cacheData.fingerprint,
        calories: plan?.dailyTargets?.calories,
      });
    }
  } catch (e) {
    console.error("[storage] Failed to set nutrition plan:", e);
  }
}

/**
 * Clear all nutrition plans for a specific user
 * Useful when profile data changes significantly
 */
export function clearNutritionPlans(userId: string): void {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    const prefix = `${PREFIX}:nutritionPlan:${userId}:`;

    // Find all keys matching this user's nutrition plans
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    // Remove all found keys
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
      console.log(`[storage] Cleared ${keysToRemove.length} nutrition plan(s) for user ${userId}`);
    }
  } catch (e) {
    console.error("[storage] Failed to clear nutrition plans:", e);
  }
}

/**
 * Clear ALL fitjourney/gymbro cache (nutrition plans, eaten meals, etc.)
 * Use this when user logs out or profile is completely reset
 */
export function clearAllNutritionCache(): void {
  if (typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    const newNutritionPrefix = `${NEW_PREFIX}:nutritionPlan:`;
    const legacyNutritionPrefix = `${LEGACY_PREFIX}:nutritionPlan:`;

    // Find all nutrition-related keys (both new and legacy)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(newNutritionPrefix) || key.startsWith(legacyNutritionPrefix))) {
        keysToRemove.push(key);
      }
    }

    // Remove all found keys
    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
      console.log(`[storage] Cleared all nutrition cache (${keysToRemove.length} items)`);
    }
  } catch (e) {
    console.error("[storage] Failed to clear nutrition cache:", e);
  }
}

/**
 * Nutrition draft for onboarding (before signup)
 * Extended to support optimistic/pending states and failsafe scenarios
 */
export type NutritionDraft = {
  status: 'pending' | 'ready';
  fingerprint: string;
  calories: number | null;
  createdAt: number; // ms
  plan?: any; // Full plan when ready
  note?: string; // 'optimistic-start' | 'failsafe-timeout' | 'manual-continue' | etc.
};

/**
 * Save nutrition draft during onboarding (device-scoped)
 */
export function saveNutritionDraft(draft: NutritionDraft): void {
  if (typeof window === "undefined") return;

  try {
    const deviceId = getDeviceId();
    const key = `${PREFIX}:nutritionDraft:${deviceId}`;
    localStorage.setItem(key, JSON.stringify(draft));

    console.log("[storage] draft saved", {
      calories: draft.calories,
      fingerprint: draft.fingerprint,
      status: draft.status,
      note: draft.note,
    });
  } catch (e) {
    console.error("[storage] Failed to save nutrition draft:", e);
  }
}

/**
 * Read nutrition draft during signup (device-scoped)
 */
export function readNutritionDraft(): NutritionDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const deviceId = getDeviceId();
    const key = `${PREFIX}:nutritionDraft:${deviceId}`;
    const data = getWithMigration(key);

    if (!data) {
      console.log("[storage] draft read: null");
      return null;
    }

    const draft = JSON.parse(data) as NutritionDraft;

    console.log("[storage] draft read", {
      calories: draft.calories,
      fingerprint: draft.fingerprint,
      status: draft.status,
      note: draft.note,
    });

    return draft;
  } catch (e) {
    console.error("[storage] Failed to read nutrition draft:", e);
    return null;
  }
}

/**
 * Clear nutrition draft after migration to user account
 */
export function clearNutritionDraft(): void {
  if (typeof window === "undefined") return;

  try {
    const deviceId = getDeviceId();
    const key = `${PREFIX}:nutritionDraft:${deviceId}`;
    localStorage.removeItem(key);

    console.log("[storage] draft cleared", { deviceId });
  } catch (e) {
    console.error("[storage] Failed to clear nutrition draft:", e);
  }
}
