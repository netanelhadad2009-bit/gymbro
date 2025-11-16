/**
 * Day Streak Utilities
 *
 * Handles streak calculation, timezone-aware day tracking,
 * and milestone progress for user engagement.
 */

import { createClient } from "@/lib/supabase/server";

export interface DayStatus {
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  done: boolean;
  isToday: boolean;
}

export interface Milestone {
  target: number;
  remainingDays: number;
  progress01: number; // 0-1
}

export interface StreakSummary {
  current: number;
  max: number;
  startedOn: string | null; // YYYY-MM-DD
  lastCheckinDate: string | null;
  thisWeek: DayStatus[];
  nextMilestone: Milestone;
  todayDone: boolean;
}

const MILESTONES = [7, 30, 100, 180, 365];

/**
 * Get user's timezone (default: Asia/Jerusalem)
 */
export function getUserTimezone(): string {
  return "Asia/Jerusalem";
}

/**
 * Get today's date in user's timezone
 */
export function getTodayInTimezone(tz: string = getUserTimezone()): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now); // YYYY-MM-DD
}

/**
 * Get start of week (Sunday) for a given date
 */
function getWeekStart(dateStr: string): Date {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay();
  const diff = day; // Days since Sunday
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - diff);
  return weekStart;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Calculate next milestone for current streak
 */
function calculateNextMilestone(currentStreak: number): Milestone {
  const nextTarget = MILESTONES.find((m) => m > currentStreak) || MILESTONES[MILESTONES.length - 1];
  const remainingDays = nextTarget - currentStreak;
  const progress01 = currentStreak / nextTarget;

  return {
    target: nextTarget,
    remainingDays: Math.max(0, remainingDays),
    progress01: Math.min(1, progress01),
  };
}

/**
 * Calculate streak from activity dates
 * Streak is consecutive days with activity, counting backwards from most recent
 * First day = 0, second consecutive day = 1, etc. (0-indexed)
 */
function calculateStreak(activityDates: string[], todayStr: string): {
  current: number;
  startedOn: string | null;
} {
  if (activityDates.length === 0) {
    return { current: 0, startedOn: null };
  }

  // Sort dates descending (most recent first)
  const sorted = [...activityDates].sort().reverse();

  let consecutiveDays = 0;
  let startedOn: string | null = null;
  const today = new Date(todayStr + "T00:00:00");

  for (let i = 0; i < sorted.length; i++) {
    const currentDate = new Date(sorted[i] + "T00:00:00");
    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - consecutiveDays);

    // Check if this date is the expected consecutive day
    if (formatDate(currentDate) === formatDate(expectedDate)) {
      consecutiveDays++;
      startedOn = sorted[i];
    } else if (consecutiveDays > 0) {
      // Break found in streak
      break;
    }
  }

  // Streak starts at 0 on first day: streak = max(0, consecutive_days - 1)
  const streak = Math.max(0, consecutiveDays - 1);

  return { current: streak, startedOn };
}

/**
 * Get streak summary for user
 */
export async function getStreakSummary(
  userId: string,
  tz: string = getUserTimezone()
): Promise<StreakSummary> {
  const supabase = await createClient();
  const todayStr = getTodayInTimezone(tz);

  // Fetch user's activity dates
  const { data: activities, error: activitiesError } = await supabase
    .from("user_activity")
    .select("d")
    .eq("user_id", userId)
    .order("d", { ascending: false });

  if (activitiesError) {
    console.error("[Streak] Error fetching activities:", activitiesError);
  }

  const activityDates = activities?.map((a) => a.d) || [];
  const todayDone = activityDates.includes(todayStr);

  // Calculate current streak
  const { current, startedOn } = calculateStreak(activityDates, todayStr);

  // Fetch stored max streak
  const { data: streakData } = await supabase
    .from("user_streaks")
    .select("max_streak, last_checkin_date")
    .eq("user_id", userId)
    .single();

  const maxStreak = Math.max(current, streakData?.max_streak || 0);
  const lastCheckinDate = streakData?.last_checkin_date || null;

  // Build this week's status
  const weekStart = getWeekStart(todayStr);
  const thisWeek: DayStatus[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = formatDate(date);

    thisWeek.push({
      date: dateStr,
      dayOfWeek: i,
      done: activityDates.includes(dateStr),
      isToday: dateStr === todayStr,
    });
  }

  // Calculate next milestone
  const nextMilestone = calculateNextMilestone(current);

  return {
    current,
    max: maxStreak,
    startedOn,
    lastCheckinDate,
    thisWeek,
    nextMilestone,
    todayDone,
  };
}

/**
 * Mark today as done and update streak
 */
export async function markTodayDone(
  userId: string,
  source: string = "auto",
  tz: string = getUserTimezone()
): Promise<StreakSummary> {
  const supabase = await createClient();
  const todayStr = getTodayInTimezone(tz);

  // Get previous streak state for logging
  const { data: prevStreakData } = await supabase
    .from("user_streaks")
    .select("current_streak, last_checkin_date")
    .eq("user_id", userId)
    .single();

  const prevStreak = prevStreakData?.current_streak ?? null;
  const prevLastCheckin = prevStreakData?.last_checkin_date ?? null;

  // Check if this is same-day repeat
  if (prevLastCheckin === todayStr) {
    console.log("[Streak] unchanged (same day)", {
      streak: prevStreak,
      date: todayStr,
    });
    // Return cached summary to avoid recalculation
    const summary = await getStreakSummary(userId, tz);
    return summary;
  }

  // Upsert activity for today (idempotent)
  const { error: activityError } = await supabase
    .from("user_activity")
    .upsert(
      {
        user_id: userId,
        d: todayStr,
        source,
      },
      {
        onConflict: "user_id,d",
        ignoreDuplicates: true,
      }
    );

  if (activityError) {
    console.error("[Streak] Error upserting activity:", activityError);
    throw new Error("Failed to mark today");
  }

  // Recalculate streak
  const summary = await getStreakSummary(userId, tz);

  // Log streak changes
  if (prevStreak === null) {
    console.log("[Streak] first day → streak=0");
  } else if (summary.current === 0 && prevStreak > 0) {
    console.log("[Streak] reset → streak=0 (gap detected)");
  } else if (summary.current > prevStreak) {
    console.log(`[Streak] +1 → streak=${summary.current}`);
  } else {
    console.log(`[Streak] unchanged → streak=${summary.current}`);
  }

  // Update user_streaks table
  const { error: streakError } = await supabase
    .from("user_streaks")
    .upsert(
      {
        user_id: userId,
        current_streak: summary.current,
        max_streak: summary.max,
        last_checkin_date: todayStr,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

  if (streakError) {
    console.error("[Streak] Error updating streak:", streakError);
  }

  return summary;
}
