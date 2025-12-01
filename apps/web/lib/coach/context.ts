/**
 * User Context for AI Coach
 *
 * Fetches and formats user data (profile, meals, weigh-ins, workouts, progress) for AI coach responses.
 * All queries respect RLS and use cookie-based authentication.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Workout exercise structure
 */
export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | null;
}

/**
 * Workout day structure
 */
export interface WorkoutDay {
  day_number: number;
  title: string;
  completed: boolean;
  exercises: WorkoutExercise[];
}

/**
 * Workout program structure
 */
export interface WorkoutProgram {
  id: string;
  title: string;
  goal: "gain" | "loss" | "recomp" | null;
  start_date: string;
  workouts: WorkoutDay[];
}

/**
 * Plan meal from menu
 */
export interface PlanMeal {
  day_index: number;
  meal_index: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  eaten_at: string | null;
}

/**
 * User badge/achievement
 */
export interface UserBadge {
  badge_code: string;
  earned_at: string;
}

/**
 * User progress data
 */
export interface UserProgress {
  total_points: number;
  badges: UserBadge[];
  current_streak: number;
  longest_streak: number;
  meals_logged_this_week: number;
  workouts_completed_this_week: number;
}

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
  // New enhanced data
  workout_program?: WorkoutProgram | null;
  plan_meals?: PlanMeal[];
  progress?: UserProgress | null;
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

/**
 * Get user's current workout program with exercises
 *
 * @param supabase - Supabase client
 * @returns Workout program or null
 */
export async function getWorkoutProgram(
  supabase: SupabaseClient
): Promise<WorkoutProgram | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get the most recent program
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, title, goal, start_date")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (programError || !program) {
    console.log("[Coach] No workout program found");
    return null;
  }

  // Get workouts with exercises
  const { data: workouts, error: workoutsError } = await supabase
    .from("workouts")
    .select(`
      day_number,
      title,
      completed,
      workout_exercises (
        name,
        sets,
        reps,
        rest_seconds
      )
    `)
    .eq("program_id", program.id)
    .order("day_number", { ascending: true });

  if (workoutsError) {
    console.warn("[Coach] Workouts fetch error:", workoutsError.message);
  }

  return {
    id: program.id,
    title: program.title,
    goal: program.goal,
    start_date: program.start_date,
    workouts: (workouts || []).map((w: any) => ({
      day_number: w.day_number,
      title: w.title,
      completed: w.completed || false,
      exercises: (w.workout_exercises || []).map((e: any) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        rest_seconds: e.rest_seconds,
      })),
    })),
  };
}

/**
 * Get user's meal plan (plan meals from menu)
 *
 * @param supabase - Supabase client
 * @returns Array of plan meals for current week
 */
export async function getPlanMeals(
  supabase: SupabaseClient
): Promise<PlanMeal[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // Get plan meals for the current week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  const { data: planMeals, error } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", user.id)
    .eq("source", "plan")
    .gte("date", weekStart.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (error) {
    console.warn("[Coach] Plan meals fetch error:", error.message);
    return [];
  }

  return (planMeals || []).map((m: any) => ({
    day_index: new Date(m.date).getDay(),
    meal_index: m.meal_index || 0,
    name: m.name,
    calories: m.calories || 0,
    protein: m.protein || 0,
    carbs: m.carbs || 0,
    fat: m.fat || 0,
    eaten_at: m.eaten_at,
  }));
}

/**
 * Get user's progress data (points, badges, streaks)
 *
 * @param supabase - Supabase client
 * @returns User progress or null
 */
export async function getUserProgress(
  supabase: SupabaseClient
): Promise<UserProgress | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get total points
  const { data: pointsData } = await supabase
    .from("points_events")
    .select("points")
    .eq("user_id", user.id);

  const totalPoints = (pointsData || []).reduce(
    (sum: number, p: any) => sum + (p.points || 0),
    0
  );

  // Get badges
  const { data: badges } = await supabase
    .from("user_badges")
    .select("badge_code, earned_at")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  // Get meals logged this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { count: mealsThisWeek } = await supabase
    .from("meals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("date", weekStart.toISOString().split("T")[0]);

  // Get workouts completed this week
  const { data: programs } = await supabase
    .from("programs")
    .select("id")
    .eq("user_id", user.id);

  let workoutsCompletedThisWeek = 0;
  if (programs && programs.length > 0) {
    const programIds = programs.map((p: any) => p.id);
    const { count } = await supabase
      .from("workouts")
      .select("*", { count: "exact", head: true })
      .in("program_id", programIds)
      .eq("completed", true);
    workoutsCompletedThisWeek = count || 0;
  }

  // Calculate streak from consecutive days with meals logged
  let currentStreak = 0;
  let longestStreak = 0;
  const { data: mealDates } = await supabase
    .from("meals")
    .select("date")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(90);

  if (mealDates && mealDates.length > 0) {
    const uniqueDates = [...new Set(mealDates.map((m: any) => m.date))].sort().reverse();
    const today = new Date().toISOString().split("T")[0];

    // Check if user logged today or yesterday
    let checkDate = new Date(today);
    let streak = 0;

    for (const dateStr of uniqueDates) {
      const mealDate = new Date(dateStr as string);
      const expectedDate = new Date(checkDate);

      if (mealDate.toISOString().split("T")[0] === expectedDate.toISOString().split("T")[0]) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (mealDate < expectedDate) {
        break;
      }
    }
    currentStreak = streak;
    longestStreak = streak; // Simplified - would need historical data for true longest
  }

  return {
    total_points: totalPoints,
    badges: (badges || []).map((b: any) => ({
      badge_code: b.badge_code,
      earned_at: b.earned_at,
    })),
    current_streak: currentStreak,
    longest_streak: longestStreak,
    meals_logged_this_week: mealsThisWeek || 0,
    workouts_completed_this_week: workoutsCompletedThisWeek,
  };
}

/**
 * Get comprehensive user context including all data
 *
 * @param supabase - Supabase client
 * @param options - Query options
 * @returns Full user context with workouts, plan meals, and progress
 */
export async function getFullUserContext(
  supabase: SupabaseClient,
  options: { days?: number } = {}
): Promise<UserContext | null> {
  // Get base context
  const baseContext = await getUserContext(supabase, options);
  if (!baseContext) return null;

  // Fetch additional data in parallel
  const [workoutProgram, planMeals, progress] = await Promise.all([
    getWorkoutProgram(supabase),
    getPlanMeals(supabase),
    getUserProgress(supabase),
  ]);

  return {
    ...baseContext,
    workout_program: workoutProgram,
    plan_meals: planMeals,
    progress: progress,
  };
}

/**
 * Summarize workout program for AI prompt (Hebrew, compact)
 *
 * @param ctx - User context
 * @returns Hebrew-formatted workout summary
 */
export function summarizeWorkoutForPrompt(ctx: UserContext | null): string {
  if (!ctx?.workout_program) {
    return "אין תוכנית אימונים פעילה.";
  }

  const prog = ctx.workout_program;
  const lines: string[] = [];

  lines.push(`תוכנית: ${prog.title}`);
  lines.push(`מטרה: ${prog.goal === "gain" ? "עלייה במסה" : prog.goal === "loss" ? "ירידה במשקל" : "חיטוב"}`);

  const completed = prog.workouts.filter((w) => w.completed).length;
  const total = prog.workouts.length;
  lines.push(`התקדמות: ${completed}/${total} אימונים הושלמו`);

  // List upcoming workouts
  const upcoming = prog.workouts.filter((w) => !w.completed).slice(0, 3);
  if (upcoming.length > 0) {
    lines.push("\nאימונים קרובים:");
    for (const w of upcoming) {
      const exerciseCount = w.exercises.length;
      lines.push(`- יום ${w.day_number}: ${w.title} (${exerciseCount} תרגילים)`);
    }
  }

  return lines.join("\n");
}

/**
 * Summarize plan meals for AI prompt (Hebrew, compact)
 *
 * @param ctx - User context
 * @returns Hebrew-formatted meal plan summary
 */
export function summarizePlanMealsForPrompt(ctx: UserContext | null): string {
  if (!ctx?.plan_meals || ctx.plan_meals.length === 0) {
    return "אין תפריט שבועי מוגדר.";
  }

  const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
  const mealsByDay = new Map<number, PlanMeal[]>();

  for (const meal of ctx.plan_meals) {
    if (!mealsByDay.has(meal.day_index)) {
      mealsByDay.set(meal.day_index, []);
    }
    mealsByDay.get(meal.day_index)!.push(meal);
  }

  const lines: string[] = ["תפריט השבוע:"];

  for (const [dayIndex, meals] of mealsByDay) {
    const dayName = dayNames[dayIndex] || `יום ${dayIndex}`;
    const totalCal = meals.reduce((sum, m) => sum + m.calories, 0);
    const eaten = meals.filter((m) => m.eaten_at).length;
    lines.push(`${dayName}: ${meals.length} ארוחות (${totalCal} קל'), ${eaten} נאכלו`);
  }

  return lines.join("\n");
}

/**
 * Summarize user progress for AI prompt (Hebrew, compact)
 *
 * @param ctx - User context
 * @returns Hebrew-formatted progress summary
 */
export function summarizeProgressForPrompt(ctx: UserContext | null): string {
  if (!ctx?.progress) {
    return "אין נתוני התקדמות זמינים.";
  }

  const prog = ctx.progress;
  const lines: string[] = [];

  lines.push(`נקודות: ${prog.total_points}`);
  lines.push(`רצף נוכחי: ${prog.current_streak} ימים`);
  lines.push(`ארוחות השבוע: ${prog.meals_logged_this_week}`);
  lines.push(`אימונים השבוע: ${prog.workouts_completed_this_week}`);

  if (prog.badges.length > 0) {
    lines.push(`תגים: ${prog.badges.length} הושגו`);
  }

  return lines.join("\n");
}
