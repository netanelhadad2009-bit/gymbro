/**
 * Progress data queries (server-side)
 * All functions are SSR-safe and use cookie-based auth
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type WeightPoint = {
  t: string; // ISO timestamp
  kg: number;
};

export type DailyNutrition = {
  d: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ProgressKPIs = {
  today: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    date: string;
  };
  avg7d: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  avg30d: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  weight: {
    current: number | null;
    delta7d: number | null;
    delta30d: number | null;
    trend: "up" | "down" | "stable" | null;
  };
};

/**
 * Get weight series for charting
 */
export async function getWeightSeries(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<WeightPoint[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from("weigh_ins")
    .select("date, weight_kg")
    .eq("user_id", userId)
    .gte("date", cutoffDate.toISOString())
    .order("date", { ascending: true });

  if (error) {
    console.error("[Progress] Weight query error:", error);
    return [];
  }

  return (data || []).map((row) => ({
    t: row.date,
    kg: row.weight_kg,
  }));
}

/**
 * Get daily nutrition rollups
 */
export async function getDailyNutrition(
  supabase: SupabaseClient,
  userId: string,
  days: number
): Promise<DailyNutrition[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("meals")
    .select("date, calories, protein, carbs, fat")
    .eq("user_id", userId)
    .gte("date", cutoffStr)
    .order("date", { ascending: true });

  if (error) {
    console.error("[Progress] Nutrition query error:", error);
    return [];
  }

  // Group by date and sum
  const grouped = new Map<string, DailyNutrition>();

  (data || []).forEach((row) => {
    const existing = grouped.get(row.date) || {
      d: row.date,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

    existing.calories += row.calories || 0;
    existing.protein += row.protein || 0;
    existing.carbs += row.carbs || 0;
    existing.fat += row.fat || 0;

    grouped.set(row.date, existing);
  });

  return Array.from(grouped.values()).sort((a, b) => a.d.localeCompare(b.d));
}

/**
 * Calculate KPIs (today, 7d avg, 30d avg, weight deltas)
 */
export async function getKpis(
  supabase: SupabaseClient,
  userId: string
): Promise<ProgressKPIs> {
  const today = new Date().toISOString().split("T")[0];

  // Get today's nutrition
  const { data: todayMeals } = await supabase
    .from("meals")
    .select("calories, protein, carbs, fat")
    .eq("user_id", userId)
    .eq("date", today);

  const todayTotals = (todayMeals || []).reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories || 0),
      protein: acc.protein + (m.protein || 0),
      carbs: acc.carbs + (m.carbs || 0),
      fat: acc.fat + (m.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Get 7d and 30d nutrition
  const nutrition7d = await getDailyNutrition(supabase, userId, 7);
  const nutrition30d = await getDailyNutrition(supabase, userId, 30);

  const avg7d = calculateAverage(nutrition7d);
  const avg30d = calculateAverage(nutrition30d);

  // Get weight data
  const weights = await getWeightSeries(supabase, userId, 90);

  const currentWeight = weights.length > 0 ? weights[weights.length - 1].kg : null;

  // Calculate weight deltas
  const delta7d = calculateWeightDelta(weights, 7);
  const delta30d = calculateWeightDelta(weights, 30);

  // Determine trend
  let trend: "up" | "down" | "stable" | null = null;
  if (delta7d !== null) {
    if (delta7d > 0.2) trend = "up";
    else if (delta7d < -0.2) trend = "down";
    else trend = "stable";
  }

  return {
    today: {
      calories: todayTotals.calories || null,
      protein: todayTotals.protein || null,
      carbs: todayTotals.carbs || null,
      fat: todayTotals.fat || null,
      date: today,
    },
    avg7d,
    avg30d,
    weight: {
      current: currentWeight,
      delta7d,
      delta30d,
      trend,
    },
  };
}

function calculateAverage(data: DailyNutrition[]): {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
} {
  if (data.length === 0) {
    return { calories: null, protein: null, carbs: null, fat: null };
  }

  const totals = data.reduce(
    (acc, d) => ({
      calories: acc.calories + d.calories,
      protein: acc.protein + d.protein,
      carbs: acc.carbs + d.carbs,
      fat: acc.fat + d.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    calories: totals.calories / data.length,
    protein: totals.protein / data.length,
    carbs: totals.carbs / data.length,
    fat: totals.fat / data.length,
  };
}

function calculateWeightDelta(weights: WeightPoint[], days: number): number | null {
  if (weights.length === 0) return null;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentWeights = weights.filter((w) => new Date(w.t) >= cutoffDate);

  if (recentWeights.length < 2) return null;

  const oldAvg =
    recentWeights.slice(0, Math.ceil(recentWeights.length / 2)).reduce((sum, w) => sum + w.kg, 0) /
    Math.ceil(recentWeights.length / 2);

  const newAvg =
    recentWeights.slice(-Math.ceil(recentWeights.length / 2)).reduce((sum, w) => sum + w.kg, 0) /
    Math.ceil(recentWeights.length / 2);

  return newAvg - oldAvg;
}
