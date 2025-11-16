/**
 * Streak Storage Utility
 *
 * Client-side localStorage to track the last seen streak value per user.
 * Used to detect when a streak increases and trigger celebration UI.
 */

interface LastSeenStreak {
  value: number;
  ymd: string; // UTC date string YYYY-MM-DD
}

const STORAGE_KEY_PREFIX = "fitjourney:streak:lastSeen:";
const BUMP_FLAG_PREFIX = "fitjourney:streak:bump:";
const LEGACY_KEY_PREFIX = "gymbro:streak:lastSeen:";
const LEGACY_BUMP_PREFIX = "gymbro:streak:bump:";

/**
 * Get current UTC date as YYYY-MM-DD string
 */
export function getTodayYMD(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the last seen streak for a user
 * @param userId - User ID to look up
 * @returns Last seen streak data or null if not found
 */
export function getLastSeenStreak(userId: string): LastSeenStreak | null {
  if (typeof window === "undefined") return null;
  if (!userId) return null;

  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    let raw = localStorage.getItem(key);

    // Try legacy key if new key not found
    if (!raw) {
      const legacyKey = `${LEGACY_KEY_PREFIX}${userId}`;
      raw = localStorage.getItem(legacyKey);

      // Migrate if found
      if (raw) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(legacyKey);
        console.log('[StreakStorage] Migrated streak data from legacy key');
      }
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Validate structure
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.value === "number" &&
      typeof parsed.ymd === "string"
    ) {
      return parsed as LastSeenStreak;
    }

    return null;
  } catch (error) {
    console.error("[StreakStorage] Error reading lastSeenStreak:", error);
    return null;
  }
}

/**
 * Set the last seen streak for a user
 * @param userId - User ID
 * @param value - Current streak value
 * @param ymd - Date string YYYY-MM-DD (defaults to today UTC)
 */
export function setLastSeenStreak(
  userId: string,
  value: number,
  ymd: string = getTodayYMD()
): void {
  if (typeof window === "undefined") return;
  if (!userId) return;

  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const data: LastSeenStreak = { value, ymd };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("[StreakStorage] Error writing lastSeenStreak:", error);
  }
}

/**
 * Clear the last seen streak for a user (useful for testing)
 * @param userId - User ID
 */
export function clearLastSeenStreak(userId: string): void {
  if (typeof window === "undefined") return;
  if (!userId) return;

  try {
    const key = `${STORAGE_KEY_PREFIX}${userId}`;
    const legacyKey = `${LEGACY_KEY_PREFIX}${userId}`;
    localStorage.removeItem(key);
    localStorage.removeItem(legacyKey); // Also clear legacy key if exists
  } catch (error) {
    console.error("[StreakStorage] Error clearing lastSeenStreak:", error);
  }
}

/**
 * Set bump flag for today (one-time celebration trigger)
 * @param userId - User ID
 * @param current - Current streak value
 * @param prev - Previous streak value (optional)
 * @param ymd - Date string YYYY-MM-DD (defaults to today UTC)
 */
export function setBumpFlag(
  userId: string,
  current: number,
  prev?: number,
  ymd: string = getTodayYMD()
): void {
  if (typeof window === "undefined") return;
  if (!userId) return;

  try {
    const key = `${BUMP_FLAG_PREFIX}${userId}:${ymd}`;
    const data = { current, prev: prev ?? current - 1, ymd };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("[StreakStorage] Error setting bump flag:", error);
  }
}

/**
 * Get bump flag for today
 * @param userId - User ID
 * @param ymd - Date string YYYY-MM-DD (defaults to today UTC)
 * @returns Bump data or null if not found
 */
export function getBumpFlag(
  userId: string,
  ymd: string = getTodayYMD()
): { current: number; prev: number; ymd: string } | null {
  if (typeof window === "undefined") return null;
  if (!userId) return null;

  try {
    const key = `${BUMP_FLAG_PREFIX}${userId}:${ymd}`;
    let raw = localStorage.getItem(key);

    // Try legacy key if new key not found
    if (!raw) {
      const legacyKey = `${LEGACY_BUMP_PREFIX}${userId}:${ymd}`;
      raw = localStorage.getItem(legacyKey);

      // Migrate if found
      if (raw) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(legacyKey);
        console.log('[StreakStorage] Migrated bump flag from legacy key');
      }
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // Validate structure
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.current === "number" &&
      typeof parsed.prev === "number" &&
      typeof parsed.ymd === "string"
    ) {
      return parsed;
    }

    return null;
  } catch (error) {
    console.error("[StreakStorage] Error reading bump flag:", error);
    return null;
  }
}

/**
 * Clear bump flag for today
 * @param userId - User ID
 * @param ymd - Date string YYYY-MM-DD (defaults to today UTC)
 */
export function clearBumpFlag(userId: string, ymd: string = getTodayYMD()): void {
  if (typeof window === "undefined") return;
  if (!userId) return;

  try {
    const key = `${BUMP_FLAG_PREFIX}${userId}:${ymd}`;
    localStorage.removeItem(key);
  } catch (error) {
    console.error("[StreakStorage] Error clearing bump flag:", error);
  }
}
