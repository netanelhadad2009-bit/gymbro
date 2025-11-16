/**
 * Journey Auto-Check Functions
 *
 * Automatic validation functions for nutrition/habit-based journey tasks.
 * These functions query the database to check if task conditions are met.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  MealLogTarget,
  ProteinTargetTarget,
  CalorieWindowTarget,
  WeighInTarget,
  StreakDaysTarget,
} from './taskTypes';

/**
 * Check if meal log target is met
 * Counts meals logged within the specified time window
 */
export async function checkMealLog(
  supabase: SupabaseClient,
  userId: string,
  target: MealLogTarget
): Promise<boolean> {
  const window = target.window || 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - window);

  const { data, error } = await supabase
    .from('meals')
    .select('id')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0]);

  if (error) {
    console.error('[AutoCheck] checkMealLog error:', error);
    return false;
  }

  const count = data?.length || 0;
  return count >= target.count;
}

/**
 * Check if protein target is met
 * Calculates daily or average protein over window
 */
export async function checkProteinTarget(
  supabase: SupabaseClient,
  userId: string,
  target: ProteinTargetTarget
): Promise<boolean> {
  const window = target.window || 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - window);

  const { data, error } = await supabase
    .from('meals')
    .select('protein, date')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0]);

  if (error) {
    console.error('[AutoCheck] checkProteinTarget error:', error);
    return false;
  }

  if (!data || data.length === 0) {
    return false;
  }

  if (target.avg) {
    // Check average over window
    const totalProtein = data.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const avgProtein = totalProtein / window;
    return avgProtein >= target.grams;
  } else {
    // Check if hit target on required number of days
    const dailyProtein = new Map<string, number>();
    data.forEach((meal) => {
      const current = dailyProtein.get(meal.date) || 0;
      dailyProtein.set(meal.date, current + (meal.protein || 0));
    });

    let daysMetTarget = 0;
    for (const [, protein] of dailyProtein) {
      if (protein >= target.grams) {
        daysMetTarget++;
      }
    }

    return daysMetTarget >= window;
  }
}

/**
 * Check if calorie window target is met
 * Validates calorie intake within specified range
 */
export async function checkCalorieWindow(
  supabase: SupabaseClient,
  userId: string,
  target: CalorieWindowTarget
): Promise<boolean> {
  const window = target.window || 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - window);

  const { data, error } = await supabase
    .from('meals')
    .select('calories, date')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0]);

  if (error) {
    console.error('[AutoCheck] checkCalorieWindow error:', error);
    return false;
  }

  if (!data || data.length === 0) {
    return false;
  }

  // Calculate daily calories
  const dailyCalories = new Map<string, number>();
  data.forEach((meal) => {
    const current = dailyCalories.get(meal.date) || 0;
    dailyCalories.set(meal.date, current + (meal.calories || 0));
  });

  let daysMetTarget = 0;

  for (const [, calories] of dailyCalories) {
    let metCondition = false;

    if (target.exact !== undefined) {
      // Check exact target (with 50 calorie tolerance)
      metCondition = Math.abs(calories - target.exact) <= 50;
    } else {
      // Check range
      const min = target.min ?? 0;
      const max = target.max ?? Infinity;
      metCondition = calories >= min && calories <= max;
    }

    if (metCondition) {
      daysMetTarget++;
    }
  }

  return daysMetTarget >= window;
}

/**
 * Check if weigh-in target is met
 * Validates number of weigh-ins and optional trend
 */
export async function checkWeighIn(
  supabase: SupabaseClient,
  userId: string,
  target: WeighInTarget
): Promise<boolean> {
  const window = target.window || 7;
  const count = target.count || 1;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - window);

  const { data, error } = await supabase
    .from('weight_logs')
    .select('weight_kg, date')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('[AutoCheck] checkWeighIn error:', error);
    return false;
  }

  if (!data || data.length < count) {
    return false;
  }

  // If no trend required, just check count
  if (!target.trend) {
    return true;
  }

  // Check trend direction
  if (data.length < 2) {
    return false;
  }

  const firstWeight = data[0].weight_kg;
  const lastWeight = data[data.length - 1].weight_kg;

  if (target.trend === 'down') {
    return lastWeight < firstWeight;
  } else if (target.trend === 'up') {
    return lastWeight > firstWeight;
  }

  return false;
}

/**
 * Check if streak days target is met
 * Validates consecutive days of specific behavior
 */
export async function checkStreakDays(
  supabase: SupabaseClient,
  userId: string,
  target: StreakDaysTarget
): Promise<boolean> {
  const requiredDays = target.days;
  const today = new Date();
  const dates: string[] = [];

  // Generate array of dates to check
  for (let i = 0; i < requiredDays; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.unshift(date.toISOString().split('T')[0]);
  }

  let consecutiveDays = 0;

  for (const date of dates) {
    let metCondition = false;

    switch (target.rule) {
      case 'any_meal': {
        const { data } = await supabase
          .from('meals')
          .select('id')
          .eq('user_id', userId)
          .eq('date', date)
          .limit(1);
        metCondition = (data?.length || 0) > 0;
        break;
      }

      case 'protein_hit': {
        // This would need a protein target value
        // For now, check if any protein was logged
        const { data } = await supabase
          .from('meals')
          .select('protein')
          .eq('user_id', userId)
          .eq('date', date);
        const totalProtein = data?.reduce((sum, m) => sum + (m.protein || 0), 0) || 0;
        // TODO: Get user's protein target from profile
        metCondition = totalProtein >= 100; // Placeholder threshold
        break;
      }

      case 'calorie_window': {
        // This would need calorie targets
        // For now, check if calories were logged
        const { data } = await supabase
          .from('meals')
          .select('calories')
          .eq('user_id', userId)
          .eq('date', date);
        const totalCalories = data?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
        metCondition = totalCalories > 0;
        break;
      }

      case 'weigh_in': {
        const { data } = await supabase
          .from('weight_logs')
          .select('id')
          .eq('user_id', userId)
          .eq('date', date)
          .limit(1);
        metCondition = (data?.length || 0) > 0;
        break;
      }
    }

    if (metCondition) {
      consecutiveDays++;
    } else {
      // Break streak if a day is missed
      consecutiveDays = 0;
    }
  }

  return consecutiveDays >= requiredDays;
}

/**
 * Master auto-check function that routes to specific checkers
 * Returns true if the task is complete
 */
export async function autoCheckTask(
  supabase: SupabaseClient,
  userId: string,
  taskType: string,
  target: any
): Promise<boolean> {
  try {
    switch (taskType) {
      case 'meal_log':
        return await checkMealLog(supabase, userId, target);

      case 'protein_target':
        return await checkProteinTarget(supabase, userId, target);

      case 'calorie_window':
        return await checkCalorieWindow(supabase, userId, target);

      case 'weigh_in':
        return await checkWeighIn(supabase, userId, target);

      case 'streak_days':
        return await checkStreakDays(supabase, userId, target);

      // habit_check and edu_read are manual - no auto-check
      case 'habit_check':
      case 'edu_read':
        return false;

      default:
        console.warn('[AutoCheck] Unknown task type:', taskType);
        return false;
    }
  } catch (error) {
    console.error('[AutoCheck] Error checking task:', error);
    return false;
  }
}

/**
 * Batch check multiple tasks at once
 * Returns a map of task IDs to completion status
 */
export async function batchAutoCheck(
  supabase: SupabaseClient,
  userId: string,
  tasks: Array<{ id: string; type: string; target: any }>
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  await Promise.all(
    tasks.map(async (task) => {
      const isComplete = await autoCheckTask(supabase, userId, task.type, task.target);
      results.set(task.id, isComplete);
    })
  );

  return results;
}
