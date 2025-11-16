/**
 * User Context for AI Coach
 *
 * Fetches and formats user data (profile, meals, weigh-ins) for AI coach responses.
 * All queries respect RLS and use cookie-based authentication.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * User context structure returned by fn_user_context
 */
export interface UserContext {
  user_id: string;
  date_range: {
    since: string;
    until: string;
  };
  profile: {
    age: number | null;
    gender: "male" | "female" | null;
    height_cm: number | null;
    weight_kg: number | null;
    target_weight_kg: number | null;
    goal: "gain" | "loss" | "maintain" | null;
    diet: "regular" | "vegan" | "vegetarian" | "keto" | "paleo" | null;
    activity_level: "low" | "moderate" | "high" | null;
    workout_days_per_week: number | null;
    injuries: string | null;
  };
  nutrition: {
    daily_totals: Array<{
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      meal_count: number;
    }>;
    averages: {
      "7d": { calories: number; protein: number };
      "14d": { calories: number; protein: number };
      "30d": { calories: number; protein: number };
    };
  };
  recent_meals: Array<{
    name: string;
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    created_at: string;
  }>;
  weigh_ins: Array<{
    date: string;
    weight_kg: number;
    notes: string | null;
  }>;
}

/**
 * Get user context for AI coach
 *
 * @param supabase - Supabase client (with user session from cookies)
 * @param options - Query options
 * @returns User context with profile, nutrition, meals, and weigh-ins
 */
export async function getUserContext(
  supabase: SupabaseClient,
  options: {
    days?: number; // Number of days to look back (default: 30)
  } = {}
): Promise<UserContext | null> {
  const { days = 30 } = options;

  // Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[getUserContext] Not authenticated:", userError);
    return null;
  }

  // Calculate date range
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sinceStr = since.toISOString().split("T")[0];
  const untilStr = until.toISOString().split("T")[0];

  // Call SQL function (RLS enforced)
  const { data, error } = await supabase.rpc("fn_user_context", {
    p_user_id: user.id,
    p_since: sinceStr,
    p_until: untilStr,
  });

  if (error) {
    console.error("[getUserContext] SQL function error:", error);
    return null;
  }

  return data as UserContext;
}

/**
 * Summarize meals for AI prompt (Hebrew, compact)
 *
 * @param ctx - User context
 * @returns Hebrew-formatted meal summary
 */
export function summarizeMealsForPrompt(ctx: UserContext | null): string {
  if (!ctx || !ctx.nutrition?.daily_totals || ctx.nutrition.daily_totals.length === 0) {
    return "אין נתוני תזונה זמינים.";
  }

  const lines: string[] = [];

  // Add daily totals (last 7 days max for brevity)
  const recentDays = ctx.nutrition.daily_totals.slice(0, 7);
  for (const day of recentDays) {
    const date = new Date(day.date).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
    });
    lines.push(
      `${date}: ${day.calories}kcal • ${day.protein}P/${day.carbs}C/${day.fat}F (${day.meal_count} ארוחות)`
    );
  }

  // Add averages if available
  if (ctx.nutrition.averages) {
    lines.push("");
    lines.push("ממוצעים:");
    if (ctx.nutrition.averages["7d"]?.calories) {
      lines.push(
        `7 ימים: ${ctx.nutrition.averages["7d"].calories}kcal, ${ctx.nutrition.averages["7d"].protein}g חלבון`
      );
    }
    if (ctx.nutrition.averages["30d"]?.calories) {
      lines.push(
        `30 ימים: ${ctx.nutrition.averages["30d"].calories}kcal, ${ctx.nutrition.averages["30d"].protein}g חלבון`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Summarize weigh-ins for AI prompt (Hebrew, compact)
 *
 * @param ctx - User context
 * @returns Hebrew-formatted weight summary with trend
 */
export function summarizeWeighInsForPrompt(ctx: UserContext | null): string {
  if (!ctx || !ctx.weigh_ins || ctx.weigh_ins.length === 0) {
    return "אין נתוני שקילה זמינים. מומלץ להוסיף שקילות באופן קבוע.";
  }

  const weighIns = ctx.weigh_ins;
  const latest = weighIns[0];
  const latestDate = new Date(latest.date).toLocaleDateString("he-IL");

  // Calculate trend
  let trend = "≈"; // stable
  let weeklyChange = 0;

  if (weighIns.length >= 2) {
    const oldest = weighIns[weighIns.length - 1];
    const daysDiff = Math.abs(
      (new Date(latest.date).getTime() - new Date(oldest.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalChange = latest.weight_kg - oldest.weight_kg;

    if (daysDiff > 0) {
      weeklyChange = (totalChange / daysDiff) * 7; // Change per week
    }

    if (weeklyChange > 0.2) {
      trend = "↑";
    } else if (weeklyChange < -0.2) {
      trend = "↓";
    }
  }

  const trendStr =
    trend === "↑"
      ? `עלייה (${weeklyChange.toFixed(1)} ק"ג/שבוע)`
      : trend === "↓"
      ? `ירידה (${Math.abs(weeklyChange).toFixed(1)} ק"ג/שבוע)`
      : "יציב";

  return `משקל אחרון: ${latest.weight_kg} ק"ג (${latestDate})\nמגמה: ${trendStr}\nשקילות: ${weighIns.length} רשומות`;
}

/**
 * Get today's nutrition summary
 *
 * @param ctx - User context
 * @returns Today's totals or null if no data
 */
export function getTodayNutrition(ctx: UserContext | null): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_count: number;
} | null {
  if (!ctx || !ctx.nutrition?.daily_totals) {
    return null;
  }

  const today = new Date().toISOString().split("T")[0];
  const todayData = ctx.nutrition.daily_totals.find((d) => d.date === today);

  return todayData || null;
}

/**
 * Get weekly nutrition summary
 *
 * @param ctx - User context
 * @returns Last 7 days averages or null if no data
 */
export function getWeeklyNutrition(ctx: UserContext | null): {
  calories: number;
  protein: number;
} | null {
  if (!ctx || !ctx.nutrition?.averages?.["7d"]) {
    return null;
  }

  return ctx.nutrition.averages["7d"];
}

/**
 * Check if user has sufficient data
 *
 * @param ctx - User context
 * @returns Object indicating what data is missing
 */
export function checkDataCompleteness(ctx: UserContext | null): {
  hasProfile: boolean;
  hasMeals: boolean;
  hasWeighIns: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];

  const hasProfile = !!(
    ctx?.profile?.age &&
    ctx?.profile?.gender &&
    ctx?.profile?.weight_kg &&
    ctx?.profile?.goal
  );

  const hasMeals = (ctx?.recent_meals?.length || 0) > 0;
  const hasWeighIns = (ctx?.weigh_ins?.length || 0) > 0;

  if (!hasProfile) {
    suggestions.push("השלימ/י את הפרופיל (גיל, מין, משקל, יעד)");
  }

  if (!hasMeals) {
    suggestions.push("הוסיפ/י ארוחות כדי שאוכל לעקוב אחרי התזונה שלך");
  }

  if (!hasWeighIns) {
    suggestions.push("הוסיפ/י שקילות כדי לעקוב אחרי המגמה במשקל");
  }

  return {
    hasProfile,
    hasMeals,
    hasWeighIns,
    suggestions,
  };
}
