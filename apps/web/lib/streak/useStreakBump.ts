/**
 * useStreakBump Hook
 *
 * Detects when a user's streak increases and triggers celebration UI.
 * Fires once per calendar day per user.
 */

"use client";

import { useMemo } from "react";
import { getLastSeenStreak, getTodayYMD } from "./storage";

export interface UseStreakBumpOptions {
  userId: string;
  currentStreak: number | null; // from server after login track resolves
  enabled?: boolean; // default true
}

export interface UseStreakBumpResult {
  shouldCelebrate: boolean;
  markShown: () => void; // write lastSeen to storage
}

/**
 * Hook to detect streak bump and trigger celebration UI
 *
 * @example
 * const { shouldCelebrate, markShown } = useStreakBump({
 *   userId: session.user.id,
 *   currentStreak: streakData?.current ?? null
 * });
 *
 * if (shouldCelebrate) {
 *   // Show celebration UI
 *   markShown(); // After showing, mark as seen
 * }
 */
export function useStreakBump({
  userId,
  currentStreak,
  enabled = true,
}: UseStreakBumpOptions): UseStreakBumpResult {
  const shouldCelebrate = useMemo(() => {
    // Feature disabled
    if (!enabled) return false;

    // No user ID or streak data
    if (!userId || currentStreak === null || currentStreak === undefined) {
      return false;
    }

    const todayYMD = getTodayYMD();
    const lastSeen = getLastSeenStreak(userId);

    // First day (streak=0): don't celebrate, but we'll update lastSeen
    if (currentStreak === 0) {
      console.log("[Streak] first day (streak=0) → no celebration", {
        userId,
        current: currentStreak,
        today: todayYMD,
      });
      return false;
    }

    // Already seen today - suppress
    if (lastSeen && lastSeen.ymd === todayYMD) {
      console.log("[Streak] suppressed (already seen today)", {
        userId,
        lastSeenYmd: lastSeen.ymd,
        today: todayYMD,
      });
      return false;
    }

    // First time with streak >= 1 OR streak increased since last seen - celebrate!
    if (!lastSeen || currentStreak > lastSeen.value) {
      console.log("[Streak] bump detected", {
        userId,
        current: currentStreak,
        lastSeen: lastSeen?.value ?? null,
        today: todayYMD,
      });
      return true;
    }

    // No increase - suppress
    console.log("[Streak] no increase", {
      userId,
      current: currentStreak,
      lastSeen: lastSeen.value,
    });
    return false;
  }, [userId, currentStreak, enabled]);

  const markShown = useMemo(() => {
    return () => {
      if (!userId || currentStreak === null || currentStreak === undefined) {
        return;
      }

      // Dynamically import to avoid issues during SSR
      import("./storage").then(({ setLastSeenStreak }) => {
        const todayYMD = getTodayYMD();
        setLastSeenStreak(userId, currentStreak, todayYMD);
        console.log("[Streak] shown", {
          userId,
          current: currentStreak,
          ymd: todayYMD,
        });
      });
    };
  }, [userId, currentStreak]);

  return { shouldCelebrate, markShown };
}
