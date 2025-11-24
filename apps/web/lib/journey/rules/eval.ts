/**
 * Stage Task Rules Evaluation
 *
 * Evaluates condition_json from user_stage_tasks against live DB state
 * Reuses patterns from existing journey/compute.ts
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface TaskCondition {
  type: string;
  target?: number;
  operator?: 'gte' | 'lte' | 'eq' | 'between';
  range?: [number, number];
  lookback_days?: number;
  use_user_target?: boolean; // Use personalized target from user's nutrition plan
}

export interface TaskEvaluation {
  canComplete: boolean;
  progress: number; // 0..1
  current?: number;
  target?: number;
  details?: string;
}

/**
 * Fetch user's personalized nutrition targets from their active plan
 *
 * IMPORTANT: Uses SAME DB source as nutrition screen for consistency:
 * - profiles.nutrition_plan.dailyTargets
 *
 * Note: Cannot access localStorage customTargets (server-side only).
 * Frontend journey sheet prioritizes localStorage customTargets over this.
 */
async function getUserNutritionTargets(
  supabase: SupabaseClient,
  userId: string
): Promise<{ calories: number; protein: number; tdee: number } | null> {
  try {
    // Fetch from profiles.nutrition_plan (same as /api/nutrition/plan and nutrition screen)
    const { data: profile } = await supabase
      .from('profiles')
      .select('nutrition_plan')
      .eq('id', userId)
      .single();

    if (!profile) {
      console.warn('[RulesEval] No profile found for user');
      return null;
    }

    // Extract nutrition plan (same structure as nutrition screen)
    const plan = profile.nutrition_plan as any;
    const dailyTargets = plan?.dailyTargets;

    if (!dailyTargets) {
      console.warn('[RulesEval] No dailyTargets found in nutrition plan');
      return null;
    }

    // Use SAME fields as nutrition screen (line 754-757 of nutrition/page.tsx)
    // Note: tdee comes from plan if not in profile
    return {
      calories: dailyTargets.calories || 0,
      protein: dailyTargets.protein_g || 0,
      tdee: dailyTargets.tdee || dailyTargets.calories || 0,
    };
  } catch (err) {
    console.error('[RulesEval] Error fetching user nutrition targets:', err);
    return null;
  }
}

/**
 * Get today's total calorie intake from meals table
 *
 * Uses SAME data source as nutrition screen:
 * - Sums calories from meals table for today's date
 *
 * This ensures calorie missions show "calories eaten today" in progress,
 * matching what the user sees in their nutrition screen.
 */
async function getTodaysCalories(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('meals')
      .select('calories')
      .eq('user_id', userId)
      .eq('date', today);

    if (!data || data.length === 0) {
      return 0;
    }

    const total = data.reduce((sum, m) => sum + (m.calories || 0), 0);
    return total;
  } catch (err) {
    console.error('[RulesEval] Error fetching today\'s calories:', err);
    return 0;
  }
}

/**
 * Evaluate a single task's condition against user's current data
 * @param stageUnlockedAt - ISO timestamp when the stage was unlocked (optional). If provided, only count data from after this timestamp.
 */
export async function evaluateTaskCondition(
  supabase: SupabaseClient,
  userId: string,
  condition: TaskCondition,
  stageUnlockedAt?: string
): Promise<TaskEvaluation> {
  const today = new Date().toISOString().split('T')[0];

  // Convert stageUnlockedAt to date string for filtering (YYYY-MM-DD)
  const sinceDate = stageUnlockedAt ? stageUnlockedAt.split('T')[0] : null;

  switch (condition.type) {
    case 'FIRST_WEIGH_IN': {
      const { data } = await supabase
        .from('weigh_ins')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      const hasWeighIn = (data?.length || 0) > 0;
      return {
        canComplete: hasWeighIn,
        progress: hasWeighIn ? 1 : 0,
        current: hasWeighIn ? 1 : 0,
        target: 1,
      };
    }

    case 'LOG_MEALS_TODAY': {
      const target = condition.target || 3;
      const { data } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', userId)
        .eq('date', today);

      const count = data?.length || 0;
      return {
        canComplete: count >= target,
        progress: Math.min(count / target, 1),
        current: count,
        target,
      };
    }

    case 'HIT_PROTEIN_GOAL': {
      // ALWAYS use user's current personalized protein target for protein goals
      // This ensures that if user changes their daily protein target in settings,
      // the mission automatically uses the updated value (not the static value
      // from when the mission was originally created)
      let target = condition.target || 120; // fallback only
      const userTargets = await getUserNutritionTargets(supabase, userId);

      if (userTargets && userTargets.protein > 0) {
        target = userTargets.protein;
        console.log('[RulesEval] HIT_PROTEIN_GOAL using current user target', {
          userId: userId.substring(0, 8),
          staticTarget: condition.target,
          currentTarget: target,
          source: 'nutrition_plan.dailyTargets',
        });
      } else {
        console.log('[RulesEval] HIT_PROTEIN_GOAL using fallback target', {
          userId: userId.substring(0, 8),
          fallbackTarget: target,
          warning: 'Could not fetch user nutrition targets, using fallback',
        });
      }

      const { data } = await supabase
        .from('meals')
        .select('protein')
        .eq('user_id', userId)
        .eq('date', today);

      const total = data?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;

      console.log('[RulesEval] HIT_PROTEIN_GOAL result', {
        userId: userId.substring(0, 8),
        current: total,
        target,
        canComplete: total >= target,
      });

      return {
        canComplete: total >= target,
        progress: Math.min(total / target, 1),
        current: Math.round(total),
        target,
      };
    }

    case 'STREAK_DAYS': {
      const target = condition.target || 7;

      // If stage hasn't been unlocked yet, return 0 progress
      if (!stageUnlockedAt) {
        return {
          canComplete: false,
          progress: 0,
          current: 0,
          target,
        };
      }

      // Calculate consecutive days with meals (only from after stage unlock)
      let query = supabase
        .from('meals')
        .select('date')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(target + 10); // Get extra to check streak

      // Only count meals from after stage was unlocked
      if (sinceDate) {
        query = query.gte('date', sinceDate);
      }

      const { data } = await query;

      if (!data || data.length === 0) {
        return { canComplete: false, progress: 0, current: 0, target };
      }

      // Count consecutive days from today backwards
      let streak = 0;
      const dates = new Set(data.map(m => m.date));
      let checkDate = new Date();

      // Don't count days before stage was unlocked
      const stageUnlockDate = sinceDate ? new Date(sinceDate) : null;

      while (streak < target) {
        const dateStr = checkDate.toISOString().split('T')[0];

        // Stop if we've gone before the stage unlock date
        if (stageUnlockDate && checkDate < stageUnlockDate) break;

        if (!dates.has(dateStr)) break;
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      return {
        canComplete: streak >= target,
        progress: Math.min(streak / target, 1),
        current: streak,
        target,
      };
    }

    case 'WEEKLY_DEFICIT': {
      const lookback = condition.lookback_days || 7;
      const buffer = (condition as any).buffer_kcal || 100; // ±100 kcal tolerance

      // ALWAYS use user's current personalized calorie target for calorie goals
      // This ensures that if user changes their daily calorie target in settings,
      // the mission automatically uses the updated value (not the static value
      // from when the mission was originally created)
      let dailyCaloriesTarget = 2000; // fallback only
      const userTargets = await getUserNutritionTargets(supabase, userId);

      if (userTargets && userTargets.calories > 0) {
        dailyCaloriesTarget = userTargets.calories;
        console.log('[RulesEval] WEEKLY_DEFICIT using current user target', {
          userId: userId.substring(0, 8),
          currentTarget: dailyCaloriesTarget,
          source: 'nutrition_plan.dailyTargets',
        });
      } else {
        console.log('[RulesEval] WEEKLY_DEFICIT using fallback target', {
          userId: userId.substring(0, 8),
          fallbackTarget: dailyCaloriesTarget,
          warning: 'Could not fetch user nutrition targets, using fallback',
        });
      }

      // Get meals for the lookback period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookback);

      const { data } = await supabase
        .from('meals')
        .select('calories, date')
        .eq('user_id', userId)
        .gte('date', cutoffDate.toISOString().split('T')[0]);

      if (!data) {
        return { canComplete: false, progress: 0, current: 0, target: lookback };
      }

      // Group meals by date and count days on target
      const dailyTotals = new Map<string, number>();
      for (const meal of data) {
        const date = meal.date;
        const current = dailyTotals.get(date) || 0;
        dailyTotals.set(date, current + (meal.calories || 0));
      }

      // Count how many days were within the allowed range
      const lowerBound = dailyCaloriesTarget - buffer;
      const upperBound = dailyCaloriesTarget + buffer;

      let successDays = 0;
      for (const dayCalories of dailyTotals.values()) {
        if (dayCalories >= lowerBound && dayCalories <= upperBound) {
          successDays++;
        }
      }

      // Calculate weekly progress as days on target / total days
      const weeklyProgress = lookback > 0 ? successDays / lookback : 0;
      const canComplete = successDays === lookback; // All days on target

      // Get today's calories for display (matches nutrition screen)
      const todaysCalories = await getTodaysCalories(supabase, userId);

      // DEBUG: Log the values being returned
      console.log('[RulesEval] WEEKLY_DEFICIT result (days-based)', {
        userId,
        todaysCalories,
        dailyCaloriesTarget,
        successDays,
        lookback,
        weeklyProgress,
        canComplete,
        buffer,
      });

      // Return days-based progress for weekly tracking
      return {
        canComplete,
        progress: weeklyProgress,           // 0..1 based on days on target
        current: successDays,                // days on target
        target: lookback,                    // total days required (usually 7)
        details: `${successDays} מתוך ${lookback} ימים בטווח`,
      };
    }

    case 'WEEKLY_SURPLUS': {
      const lookback = condition.lookback_days || 7;
      const buffer = (condition as any).buffer_kcal || 100; // ±100 kcal tolerance

      // ALWAYS use user's current personalized calorie target for calorie goals
      // This ensures that if user changes their daily calorie target in settings,
      // the mission automatically uses the updated value (not the static value
      // from when the mission was originally created)
      let dailyCaloriesTarget = 2500; // fallback only
      const userTargets = await getUserNutritionTargets(supabase, userId);

      if (userTargets && userTargets.calories > 0) {
        dailyCaloriesTarget = userTargets.calories;
        console.log('[RulesEval] WEEKLY_SURPLUS using current user target', {
          userId: userId.substring(0, 8),
          currentTarget: dailyCaloriesTarget,
          source: 'nutrition_plan.dailyTargets',
        });
      } else {
        console.log('[RulesEval] WEEKLY_SURPLUS using fallback target', {
          userId: userId.substring(0, 8),
          fallbackTarget: dailyCaloriesTarget,
          warning: 'Could not fetch user nutrition targets, using fallback',
        });
      }

      // Get meals for the lookback period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookback);

      const { data } = await supabase
        .from('meals')
        .select('calories, date')
        .eq('user_id', userId)
        .gte('date', cutoffDate.toISOString().split('T')[0]);

      if (!data) {
        return { canComplete: false, progress: 0, current: 0, target: lookback };
      }

      // Group meals by date and count days on target
      const dailyTotals = new Map<string, number>();
      for (const meal of data) {
        const date = meal.date;
        const current = dailyTotals.get(date) || 0;
        dailyTotals.set(date, current + (meal.calories || 0));
      }

      // Count how many days were within the allowed range
      const lowerBound = dailyCaloriesTarget - buffer;
      const upperBound = dailyCaloriesTarget + buffer;

      let successDays = 0;
      for (const dayCalories of dailyTotals.values()) {
        if (dayCalories >= lowerBound && dayCalories <= upperBound) {
          successDays++;
        }
      }

      // Calculate weekly progress as days on target / total days
      const weeklyProgress = lookback > 0 ? successDays / lookback : 0;
      const canComplete = successDays === lookback; // All days on target

      // Get today's calories for display (matches nutrition screen)
      const todaysCalories = await getTodaysCalories(supabase, userId);

      // DEBUG: Log the values being returned
      console.log('[RulesEval] WEEKLY_SURPLUS result (days-based)', {
        userId,
        todaysCalories,
        dailyCaloriesTarget,
        successDays,
        lookback,
        weeklyProgress,
        canComplete,
        buffer,
      });

      // Return days-based progress for weekly tracking
      return {
        canComplete,
        progress: weeklyProgress,           // 0..1 based on days on target
        current: successDays,                // days on target
        target: lookback,                    // total days required (usually 7)
        details: `${successDays} מתוך ${lookback} ימים בטווח`,
      };
    }

    case 'WEEKLY_BALANCED': {
      const lookback = condition.lookback_days || 7;
      const buffer = (condition as any).buffer_kcal || condition.target || 200; // ±tolerance

      // ALWAYS use user's current personalized calorie target for calorie goals
      // This ensures that if user changes their daily calorie target in settings,
      // the mission automatically uses the updated value (not the static value
      // from when the mission was originally created)
      let dailyCaloriesTarget = 2200; // fallback only
      const userTargets = await getUserNutritionTargets(supabase, userId);

      if (userTargets && userTargets.calories > 0) {
        dailyCaloriesTarget = userTargets.calories;
        console.log('[RulesEval] WEEKLY_BALANCED using current user target', {
          userId: userId.substring(0, 8),
          currentTarget: dailyCaloriesTarget,
          source: 'nutrition_plan.dailyTargets',
        });
      } else {
        console.log('[RulesEval] WEEKLY_BALANCED using fallback target', {
          userId: userId.substring(0, 8),
          fallbackTarget: dailyCaloriesTarget,
          warning: 'Could not fetch user nutrition targets, using fallback',
        });
      }

      // Get meals for the lookback period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookback);

      const { data } = await supabase
        .from('meals')
        .select('calories, date')
        .eq('user_id', userId)
        .gte('date', cutoffDate.toISOString().split('T')[0]);

      if (!data) {
        return { canComplete: false, progress: 0, current: 0, target: lookback };
      }

      // Group meals by date and count days on target
      const dailyTotals = new Map<string, number>();
      for (const meal of data) {
        const date = meal.date;
        const current = dailyTotals.get(date) || 0;
        dailyTotals.set(date, current + (meal.calories || 0));
      }

      // Count how many days were within the allowed range
      const lowerBound = dailyCaloriesTarget - buffer;
      const upperBound = dailyCaloriesTarget + buffer;

      let successDays = 0;
      for (const dayCalories of dailyTotals.values()) {
        if (dayCalories >= lowerBound && dayCalories <= upperBound) {
          successDays++;
        }
      }

      // Calculate weekly progress as days on target / total days
      const weeklyProgress = lookback > 0 ? successDays / lookback : 0;
      const canComplete = successDays === lookback; // All days on target

      // Get today's calories for display (matches nutrition screen)
      const todaysCalories = await getTodaysCalories(supabase, userId);

      // DEBUG: Log the days-based values being returned
      console.log('[RulesEval] WEEKLY_BALANCED result (days-based)', {
        userId,
        todaysCalories,
        dailyCaloriesTarget,
        successDays,
        lookback,
        weeklyProgress,
        canComplete,
        buffer,
      });

      // Return days-based progress for weekly tracking
      return {
        canComplete,
        progress: weeklyProgress,           // 0..1 based on days on target
        current: successDays,                // days on target
        target: lookback,                    // total days required (usually 7)
        details: `${successDays} מתוך ${lookback} ימים בטווח`,
      };
    }

    case 'TOTAL_MEALS_LOGGED': {
      const target = condition.target || 50;

      // If stage hasn't been unlocked yet, return 0 progress
      if (!stageUnlockedAt) {
        return {
          canComplete: false,
          progress: 0,
          current: 0,
          target,
        };
      }

      let query = supabase
        .from('meals')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Only count meals from after stage was unlocked
      if (sinceDate) {
        query = query.gte('date', sinceDate);
      }

      const { count } = await query;

      const total = count || 0;
      return {
        canComplete: total >= target,
        progress: Math.min(total / target, 1),
        current: total,
        target,
      };
    }

    case 'TOTAL_WEIGH_INS': {
      const target = condition.target || 10;

      // If stage hasn't been unlocked yet, return 0 progress
      if (!stageUnlockedAt) {
        return {
          canComplete: false,
          progress: 0,
          current: 0,
          target,
        };
      }

      let query = supabase
        .from('weigh_ins')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Only count weigh-ins from after stage was unlocked
      if (sinceDate) {
        query = query.gte('date', sinceDate);
      }

      const { count } = await query;

      const total = count || 0;
      return {
        canComplete: total >= target,
        progress: Math.min(total / target, 1),
        current: total,
        target,
      };
    }

    default:
      console.warn(`[RulesEval] Unknown condition type: ${condition.type}`);
      return { canComplete: false, progress: 0 };
  }
}

/**
 * Evaluate multiple conditions (AND logic)
 */
export async function evaluateTaskConditions(
  supabase: SupabaseClient,
  userId: string,
  conditions: TaskCondition[],
  stageUnlockedAt?: string
): Promise<TaskEvaluation> {
  if (conditions.length === 0) {
    return { canComplete: true, progress: 1 };
  }

  const results = await Promise.all(
    conditions.map(c => evaluateTaskCondition(supabase, userId, c, stageUnlockedAt))
  );

  const allComplete = results.every(r => r.canComplete);
  const avgProgress = results.reduce((sum, r) => sum + r.progress, 0) / results.length;

  return {
    canComplete: allComplete,
    progress: avgProgress,
    details: results.map(r => r.details).filter(Boolean).join(', '),
  };
}
