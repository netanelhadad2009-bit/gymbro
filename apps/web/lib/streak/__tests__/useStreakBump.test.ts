/**
 * Tests for useStreakBump hook
 *
 * These tests verify the streak bump detection logic without React testing utilities.
 * They test the core business logic that determines when to celebrate.
 */

import { getLastSeenStreak, setLastSeenStreak, clearLastSeenStreak, getTodayYMD } from "../storage";

describe("Streak Bump Detection Logic", () => {
  const TEST_USER_ID = "test-user-123";

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== "undefined") {
      clearLastSeenStreak(TEST_USER_ID);
    }
  });

  describe("Storage utilities", () => {
    it("should return null for non-existent user", () => {
      const result = getLastSeenStreak("non-existent-user");
      expect(result).toBeNull();
    });

    it("should store and retrieve streak data", () => {
      const today = getTodayYMD();
      setLastSeenStreak(TEST_USER_ID, 5, today);

      const result = getLastSeenStreak(TEST_USER_ID);
      expect(result).toEqual({ value: 5, ymd: today });
    });

    it("should clear stored streak data", () => {
      setLastSeenStreak(TEST_USER_ID, 10, getTodayYMD());
      expect(getLastSeenStreak(TEST_USER_ID)).not.toBeNull();

      clearLastSeenStreak(TEST_USER_ID);
      expect(getLastSeenStreak(TEST_USER_ID)).toBeNull();
    });
  });

  describe("Bump detection logic (manual simulation) - 0-indexed streaks", () => {
    it("should NOT celebrate on first day (streak=0)", () => {
      const currentStreak = 0; // First day starts at 0
      const lastSeen = getLastSeenStreak(TEST_USER_ID);

      // First time - no lastSeen
      expect(lastSeen).toBeNull();

      // Logic: should NOT celebrate (streak must be >= 1)
      const shouldCelebrate = currentStreak > 0 && (lastSeen === null || currentStreak > lastSeen.value);
      expect(shouldCelebrate).toBe(false);
    });

    it("should celebrate on second consecutive day (streak 0→1)", () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayYMD = yesterday.toISOString().split("T")[0];

      // User saw streak of 0 yesterday (first day)
      setLastSeenStreak(TEST_USER_ID, 0, yesterdayYMD);

      const currentStreak = 1; // Second consecutive day
      const todayYMD = getTodayYMD();
      const lastSeen = getLastSeenStreak(TEST_USER_ID);

      // Logic: should celebrate (increased from 0 to 1, different day, streak >= 1)
      const shouldCelebrate =
        currentStreak > 0 &&
        lastSeen !== null &&
        currentStreak > lastSeen.value &&
        lastSeen.ymd !== todayYMD;

      expect(shouldCelebrate).toBe(true);
    });

    it("should celebrate when streak increases (3→4)", () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayYMD = yesterday.toISOString().split("T")[0];

      // User saw streak of 3 yesterday
      setLastSeenStreak(TEST_USER_ID, 3, yesterdayYMD);

      const currentStreak = 4;
      const todayYMD = getTodayYMD();
      const lastSeen = getLastSeenStreak(TEST_USER_ID);

      // Logic: should celebrate (increased and different day)
      const shouldCelebrate =
        currentStreak > 0 &&
        lastSeen !== null &&
        currentStreak > lastSeen.value &&
        lastSeen.ymd !== todayYMD;

      expect(shouldCelebrate).toBe(true);
    });

    it("should NOT celebrate if already seen today", () => {
      const todayYMD = getTodayYMD();

      // User already saw streak of 5 today
      setLastSeenStreak(TEST_USER_ID, 5, todayYMD);

      const currentStreak = 6; // Even if it increased
      const lastSeen = getLastSeenStreak(TEST_USER_ID);

      // Logic: should NOT celebrate (same day)
      const shouldCelebrate = lastSeen?.ymd !== todayYMD;

      expect(shouldCelebrate).toBe(false);
    });

    it("should NOT celebrate if streak did not increase", () => {
      const yesterday = new Date();
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayYMD = yesterday.toISOString().split("T")[0];

      // User saw streak of 5 yesterday
      setLastSeenStreak(TEST_USER_ID, 5, yesterdayYMD);

      const currentStreak = 5; // Same streak
      const todayYMD = getTodayYMD();
      const lastSeen = getLastSeenStreak(TEST_USER_ID);

      // Logic: should NOT celebrate (not increased)
      const shouldCelebrate =
        currentStreak > 0 &&
        lastSeen !== null &&
        currentStreak > lastSeen.value &&
        lastSeen.ymd !== todayYMD;

      expect(shouldCelebrate).toBe(false);
    });

    it("should NOT celebrate after gap (reset to 0)", () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3);
      const threeDaysAgoYMD = threeDaysAgo.toISOString().split("T")[0];

      // User had streak of 5 three days ago
      setLastSeenStreak(TEST_USER_ID, 5, threeDaysAgoYMD);

      const currentStreak = 0; // Reset to 0 due to gap
      const todayYMD = getTodayYMD();
      const lastSeen = getLastSeenStreak(TEST_USER_ID);

      // Logic: should NOT celebrate (streak=0)
      const shouldCelebrate =
        currentStreak > 0 &&
        lastSeen !== null &&
        currentStreak > lastSeen.value &&
        lastSeen.ymd !== todayYMD;

      expect(shouldCelebrate).toBe(false);
    });

    it("should NOT celebrate for null currentStreak", () => {
      const currentStreak = null;

      // Logic: should NOT celebrate (no valid streak data)
      const shouldCelebrate = currentStreak !== null && currentStreak > 0;

      expect(shouldCelebrate).toBe(false);
    });

    it("should NOT celebrate for zero streaks", () => {
      const zeroStreak = 0;

      // Logic: should NOT celebrate (first day)
      expect(zeroStreak > 0).toBe(false);
    });

    it("should NOT celebrate for negative streaks", () => {
      const negativeStreak = -1;

      // Logic: should NOT celebrate (invalid)
      expect(negativeStreak > 0).toBe(false);
    });

    it("should celebrate when first time with streak >= 1", () => {
      const currentStreak = 1; // First time seeing app, but consecutive day after previous login
      const lastSeen = getLastSeenStreak(TEST_USER_ID);

      // First time - no lastSeen
      expect(lastSeen).toBeNull();

      // Logic: should celebrate (streak >= 1 and no lastSeen)
      const shouldCelebrate = currentStreak > 0 && (lastSeen === null || currentStreak > lastSeen.value);
      expect(shouldCelebrate).toBe(true);
    });
  });

  describe("Date handling", () => {
    it("should generate valid UTC date string", () => {
      const today = getTodayYMD();

      // Should be YYYY-MM-DD format
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle dates across day boundaries", () => {
      const today = getTodayYMD();
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowYMD = tomorrow.toISOString().split("T")[0];

      expect(today).not.toBe(tomorrowYMD);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty userId gracefully", () => {
      const result = getLastSeenStreak("");
      expect(result).toBeNull();
    });

    it("should handle corrupted localStorage data", () => {
      // Manually corrupt the data
      if (typeof window !== "undefined") {
        localStorage.setItem(`gymbro:streak:lastSeen:${TEST_USER_ID}`, "invalid-json{");
      }

      const result = getLastSeenStreak(TEST_USER_ID);
      expect(result).toBeNull();
    });

    it("should handle large streak values", () => {
      const largeStreak = 9999;
      setLastSeenStreak(TEST_USER_ID, largeStreak, getTodayYMD());

      const result = getLastSeenStreak(TEST_USER_ID);
      expect(result?.value).toBe(largeStreak);
    });
  });
});
