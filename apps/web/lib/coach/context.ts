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
    userId?: string; // Optional: pass user ID directly to avoid auth.getUser() issues
  } = {}
): Promise<UserContext | null> {
  const { days = 30 } = options;

  // Get user ID - either from options or from auth
  let userId = options.userId;
  if (!userId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("[getUserContext] Not authenticated:", userError);
      return null;
    }
    userId = user.id;
  }

  console.log("[getUserContext] Using userId:", userId.slice(0, 8) + "...");

  // Calculate date range
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const sinceStr = since.toISOString().split("T")[0];
  const untilStr = until.toISOString().split("T")[0];

  // Try SQL function first (RLS enforced)
  const { data, error } = await supabase.rpc("fn_user_context", {
    p_user_id: userId,
    p_since: sinceStr,
    p_until: untilStr,
  });

  if (!error && data) {
    console.log("[getUserContext] SQL function success");
    return data as UserContext;
  }

  // SQL function failed - fall back to direct queries
  console.warn("[getUserContext] SQL function failed, using direct queries:", error?.message);

  // Fallback: query tables directly
  try {
    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    // Get recent meals
    const { data: meals } = await supabase
      .from("meals")
      .select("name, date, calories, protein, carbs, fat, created_at")
      .eq("user_id", userId)
      .gte("date", sinceStr)
      .order("created_at", { ascending: false })
      .limit(50);

    // Get weigh-ins
    const { data: weighIns } = await supabase
      .from("weigh_ins")
      .select("date, weight_kg, notes")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(12);

    console.log("[getUserContext] Fallback queries complete:", {
      hasProfile: !!profile,
      mealCount: meals?.length || 0,
      weighInCount: weighIns?.length || 0,
    });

    // Build nutrition aggregates from meals
    const dailyTotals: Array<{
      date: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      meal_count: number;
    }> = [];

    if (meals && meals.length > 0) {
      const byDate = new Map<string, typeof dailyTotals[0]>();
      for (const m of meals) {
        const d = m.date;
        if (!byDate.has(d)) {
          byDate.set(d, { date: d, calories: 0, protein: 0, carbs: 0, fat: 0, meal_count: 0 });
        }
        const day = byDate.get(d)!;
        day.calories += m.calories || 0;
        day.protein += m.protein || 0;
        day.carbs += m.carbs || 0;
        day.fat += m.fat || 0;
        day.meal_count++;
      }
      dailyTotals.push(...Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date)));
    }

    return {
      user_id: userId,
      date_range: { since: sinceStr, until: untilStr },
      profile: profile ? {
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        target_weight_kg: profile.target_weight_kg,
        goal: profile.goal,
        diet: profile.diet,
        activity_level: profile.activity_level,
        workout_days_per_week: profile.workout_days_per_week,
        injuries: profile.injuries,
      } : {
        age: null, gender: null, height_cm: null, weight_kg: null,
        target_weight_kg: null, goal: null, diet: null,
        activity_level: null, workout_days_per_week: null, injuries: null,
      },
      nutrition: {
        daily_totals: dailyTotals,
        averages: {
          "7d": { calories: 0, protein: 0 },
          "14d": { calories: 0, protein: 0 },
          "30d": { calories: 0, protein: 0 },
        },
      },
      recent_meals: (meals || []).slice(0, 5).map((m: any) => ({
        name: m.name,
        date: m.date,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fat: m.fat,
        created_at: m.created_at,
      })),
      weigh_ins: (weighIns || []).map((w: any) => ({
        date: w.date,
        weight_kg: w.weight_kg,
        notes: w.notes,
      })),
    };
  } catch (fallbackErr) {
    console.error("[getUserContext] Fallback queries failed:", fallbackErr);
    return null;
  }
}

/**
 * Summarize meals for AI prompt (English, compact)
 *
 * @param ctx - User context
 * @returns English-formatted meal summary
 */
export function summarizeMealsForPrompt(ctx: UserContext | null): string {
  if (!ctx || !ctx.nutrition?.daily_totals || ctx.nutrition.daily_totals.length === 0) {
    return "User hasn't logged any meals in the app yet. Encourage them to add meals.";
  }

  const lines: string[] = [];

  // Add daily totals (last 7 days max for brevity)
  const recentDays = ctx.nutrition.daily_totals.slice(0, 7);
  for (const day of recentDays) {
    const date = new Date(day.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    lines.push(
      `${date}: ${day.calories}kcal • ${day.protein}P/${day.carbs}C/${day.fat}F (${day.meal_count} meals)`
    );
  }

  // Add averages if available
  if (ctx.nutrition.averages) {
    lines.push("");
    lines.push("Averages:");
    if (ctx.nutrition.averages["7d"]?.calories) {
      lines.push(
        `7 days: ${ctx.nutrition.averages["7d"].calories}kcal, ${ctx.nutrition.averages["7d"].protein}g protein`
      );
    }
    if (ctx.nutrition.averages["30d"]?.calories) {
      lines.push(
        `30 days: ${ctx.nutrition.averages["30d"].calories}kcal, ${ctx.nutrition.averages["30d"].protein}g protein`
      );
    }
  }

  return lines.join("\n");
}

/**
 * Summarize weigh-ins for AI prompt (English, compact)
 *
 * @param ctx - User context
 * @returns English-formatted weight summary with trend
 */
export function summarizeWeighInsForPrompt(ctx: UserContext | null): string {
  if (!ctx || !ctx.weigh_ins || ctx.weigh_ins.length === 0) {
    return "User hasn't logged any weigh-ins in the app yet. Encourage them to add weigh-ins on the Profile page.";
  }

  const weighIns = ctx.weigh_ins;
  const latest = weighIns[0];
  const latestDate = new Date(latest.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

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
      ? `Gaining (${weeklyChange.toFixed(1)} kg/week)`
      : trend === "↓"
      ? `Losing (${Math.abs(weeklyChange).toFixed(1)} kg/week)`
      : "Stable";

  return `Latest weight: ${latest.weight_kg} kg (${latestDate})\nTrend: ${trendStr}\nWeigh-ins: ${weighIns.length} records`;
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
    suggestions.push("Complete your profile (age, gender, weight, goal)");
  }

  if (!hasMeals) {
    suggestions.push("Add meals so I can track your nutrition");
  }

  if (!hasWeighIns) {
    suggestions.push("Add weigh-ins to track your weight trend");
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
 * @param userId - User ID
 * @returns Workout program or null
 */
export async function getWorkoutProgram(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkoutProgram | null> {
  if (!userId) return null;

  // Get the most recent program
  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, title, goal, start_date")
    .eq("user_id", userId)
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
 * @param userId - User ID
 * @returns Array of plan meals for current week
 */
export async function getPlanMeals(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanMeal[]> {
  if (!userId) return [];

  // Get plan meals for the current week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);

  const { data: planMeals, error } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
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
 * @param userId - User ID
 * @returns User progress or null
 */
export async function getUserProgress(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProgress | null> {
  if (!userId) return null;

  // Get total points
  const { data: pointsData } = await supabase
    .from("points_events")
    .select("points")
    .eq("user_id", userId);

  const totalPoints = (pointsData || []).reduce(
    (sum: number, p: any) => sum + (p.points || 0),
    0
  );

  // Get badges
  const { data: badges } = await supabase
    .from("user_badges")
    .select("badge_code, earned_at")
    .eq("user_id", userId)
    .order("earned_at", { ascending: false });

  // Get meals logged this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { count: mealsThisWeek } = await supabase
    .from("meals")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("date", weekStart.toISOString().split("T")[0]);

  // Get workouts completed this week
  const { data: programs } = await supabase
    .from("programs")
    .select("id")
    .eq("user_id", userId);

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
    .eq("user_id", userId)
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
  options: { days?: number; userId?: string } = {}
): Promise<UserContext | null> {
  // Get base context (pass userId if provided)
  const baseContext = await getUserContext(supabase, options);
  if (!baseContext) return null;

  // Use userId from base context for subsequent queries
  const userId = baseContext.user_id;

  // Fetch additional data in parallel
  const [workoutProgram, planMeals, progress] = await Promise.all([
    getWorkoutProgram(supabase, userId),
    getPlanMeals(supabase, userId),
    getUserProgress(supabase, userId),
  ]);

  return {
    ...baseContext,
    workout_program: workoutProgram,
    plan_meals: planMeals,
    progress: progress,
  };
}

/**
 * Summarize workout program for AI prompt (English, compact)
 *
 * @param ctx - User context
 * @returns English-formatted workout summary
 */
export function summarizeWorkoutForPrompt(ctx: UserContext | null): string {
  if (!ctx?.workout_program) {
    return "User hasn't created a workout program yet. Encourage them to create a personalized program.";
  }

  const prog = ctx.workout_program;
  const lines: string[] = [];

  lines.push(`Program: ${prog.title}`);
  lines.push(`Goal: ${prog.goal === "gain" ? "Build muscle" : prog.goal === "loss" ? "Lose weight" : "Body recomposition"}`);

  const completed = prog.workouts.filter((w) => w.completed).length;
  const total = prog.workouts.length;
  lines.push(`Progress: ${completed}/${total} workouts completed`);

  // List upcoming workouts
  const upcoming = prog.workouts.filter((w) => !w.completed).slice(0, 3);
  if (upcoming.length > 0) {
    lines.push("\nUpcoming workouts:");
    for (const w of upcoming) {
      const exerciseCount = w.exercises.length;
      lines.push(`- Day ${w.day_number}: ${w.title} (${exerciseCount} exercises)`);
    }
  }

  return lines.join("\n");
}

/**
 * Summarize plan meals for AI prompt (English, compact)
 *
 * @param ctx - User context
 * @returns English-formatted meal plan summary
 */
export function summarizePlanMealsForPrompt(ctx: UserContext | null): string {
  if (!ctx?.plan_meals || ctx.plan_meals.length === 0) {
    return "User hasn't created a weekly meal plan yet. Encourage them to create a nutrition menu on the Menu page.";
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const mealsByDay = new Map<number, PlanMeal[]>();

  for (const meal of ctx.plan_meals) {
    if (!mealsByDay.has(meal.day_index)) {
      mealsByDay.set(meal.day_index, []);
    }
    mealsByDay.get(meal.day_index)!.push(meal);
  }

  const lines: string[] = ["Weekly Menu:"];

  for (const [dayIndex, meals] of mealsByDay) {
    const dayName = dayNames[dayIndex] || `Day ${dayIndex}`;
    const totalCal = meals.reduce((sum, m) => sum + m.calories, 0);
    const eaten = meals.filter((m) => m.eaten_at).length;
    lines.push(`${dayName}: ${meals.length} meals (${totalCal} kcal), ${eaten} eaten`);
  }

  return lines.join("\n");
}

/**
 * Summarize user progress for AI prompt (English, compact)
 *
 * @param ctx - User context
 * @returns English-formatted progress summary
 */
export function summarizeProgressForPrompt(ctx: UserContext | null): string {
  if (!ctx?.progress) {
    return "User hasn't earned any points or badges yet. Encourage them to use the app regularly.";
  }

  const prog = ctx.progress;
  const lines: string[] = [];

  lines.push(`Points: ${prog.total_points}`);
  lines.push(`Current streak: ${prog.current_streak} days`);
  lines.push(`Meals this week: ${prog.meals_logged_this_week}`);
  lines.push(`Workouts this week: ${prog.workouts_completed_this_week}`);

  if (prog.badges.length > 0) {
    lines.push(`Badges: ${prog.badges.length} earned`);
  }

  return lines.join("\n");
}
