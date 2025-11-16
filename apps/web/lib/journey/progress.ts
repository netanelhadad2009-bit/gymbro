/**
 * Shared progress calculation helpers for journey tasks
 * Used by both OrbNode (map display) and MilestoneDetailSheet (detail view)
 */

import { StageTask } from './stages/useStages';
import { UserNutritionTargets } from './userTargets';

// Helper to clamp values between 0 and 1
function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

// Helper to get today's total calorie intake (same as nutrition screen)
export async function getTodaysCalories(): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`/api/meals?date=${today}`);
    if (!response.ok) return 0;

    const data = await response.json();
    const meals = data.meals || [];

    // Sum calories from all meals
    const total = meals.reduce((sum: number, meal: any) => {
      return sum + (meal.calories || 0);
    }, 0);

    return total;
  } catch (err) {
    console.error('[Progress] Failed to fetch today\'s calories:', err);
    return 0;
  }
}

// Compute correct protein target with strict priority
export function computeProteinTarget(
  task: StageTask,
  userTargets?: UserNutritionTargets | null
): number {
  const useUserTarget = task.condition_json?.use_user_target || false;
  let target: number;

  // STRICT PRIORITY ORDER:
  // 1. userTargets.protein (if useUserTarget is true and value is positive)
  // 2. task.target (backend-resolved value)
  // 3. condition_json.target (fallback)
  if (useUserTarget && userTargets?.protein && userTargets.protein > 0) {
    target = Math.round(userTargets.protein);
  } else if (typeof task.target === 'number') {
    target = Math.round(task.target);
  } else {
    target = task.condition_json?.target ?? 120;
  }

  return target;
}

// Compute correct calories target with strict priority
export function computeCaloriesTarget(
  task: StageTask,
  userTargets?: UserNutritionTargets | null
): number {
  const useUserTarget = task.condition_json?.use_user_target || false;
  let target: number;

  // STRICT PRIORITY ORDER:
  // 1. userTargets.calories (if useUserTarget is true and value is positive)
  // 2. task.target (backend-resolved value)
  // 3. condition_json.target (fallback)
  if (useUserTarget && userTargets?.calories && userTargets.calories > 0) {
    target = Math.round(userTargets.calories);
  } else if (typeof task.target === 'number') {
    target = Math.round(task.target);
  } else {
    target = task.condition_json?.target ?? 2000;
  }

  return target;
}

/**
 * Calculate effective progress for a task
 * Returns a value between 0 and 1
 *
 * For protein missions: uses current grams / target grams
 * For weekly calorie missions: uses days on target / total days
 * For daily calorie missions: uses today's calories / daily target
 * For other missions: uses task.progress from backend
 */
export function getTaskEffectiveProgress(
  task: StageTask,
  opts?: {
    userTargets?: UserNutritionTargets | null;
    todaysCalories?: number;
  }
): number {
  const keyCode = task.key_code.toUpperCase();
  const conditionType = task.condition_json?.type;

  // Check mission types
  const isProteinMission = keyCode.includes('PROTEIN') || conditionType === 'HIT_PROTEIN_GOAL';
  const isWeeklyCalorieMission =
    conditionType === 'WEEKLY_DEFICIT' ||
    conditionType === 'WEEKLY_SURPLUS' ||
    conditionType === 'WEEKLY_BALANCED';
  const isCalorieMission = isWeeklyCalorieMission || keyCode.includes('CALORIES');

  // 1) Protein daily mission: use current grams vs target grams
  if (isProteinMission) {
    const proteinTarget = computeProteinTarget(task, opts?.userTargets);
    if (typeof task.current === 'number' && proteinTarget > 0) {
      return clamp01(task.current / proteinTarget);
    }
  }

  // 2) Weekly calorie mission: use days-based progress (successDays / days)
  // Backend returns current=successDays, target=lookback
  else if (isWeeklyCalorieMission) {
    const weeklyCurrentDays = typeof task.current === 'number' ? task.current : 0;
    const weeklyTargetDays = typeof task.target === 'number' && task.target > 0 ? task.target : 7;
    return clamp01(weeklyCurrentDays / weeklyTargetDays);
  }

  // 3) Daily calorie mission (non-weekly): use today's calories vs daily target
  else if (isCalorieMission && opts?.todaysCalories !== undefined) {
    const caloriesTarget = computeCaloriesTarget(task, opts?.userTargets);
    if (caloriesTarget > 0) {
      return clamp01(opts.todaysCalories / caloriesTarget);
    }
  }

  // Default: use backend progress
  return task.progress ?? 0;
}
