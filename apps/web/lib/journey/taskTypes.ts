/**
 * Journey Task Type Definitions
 *
 * Defines the ONLY allowed task types for the Journey system.
 * All tasks must be nutrition or habit-based - NO workout/training tasks allowed.
 */

// ONLY allowed task types (hard-coded enum)
export const ALLOWED_TASK_TYPES = [
  'meal_log',
  'protein_target',
  'calorie_window',
  'weigh_in',
  'streak_days',
  'habit_check',
  'edu_read'
] as const;

export type TaskType = typeof ALLOWED_TASK_TYPES[number];

/**
 * Validates that a given type is an allowed task type
 */
export function validateTaskType(type: string): type is TaskType {
  return (ALLOWED_TASK_TYPES as readonly string[]).includes(type);
}

/**
 * Throws an error if task type is invalid
 */
export function assertValidTaskType(type: string): asserts type is TaskType {
  if (!validateTaskType(type)) {
    throw new Error(`Invalid task type: ${type}. Allowed types: ${ALLOWED_TASK_TYPES.join(', ')}`);
  }
}

// ===================================
// Task Target Schemas
// ===================================

/**
 * meal_log: Track number of meals logged
 * Example: Log 7 meals in 7 days, or 3 meals in 1 day
 */
export interface MealLogTarget {
  count: number;          // Number of meals to log
  window?: number;        // Days window (default 1)
}

/**
 * protein_target: Hit protein target in grams
 * Example: Consume 150g protein today, or average 140g over 7 days
 */
export interface ProteinTargetTarget {
  grams: number;          // Target protein in grams
  window?: number;        // Days window (default 1)
  avg?: boolean;          // If true, must average over window (default false = daily)
}

/**
 * calorie_window: Stay within calorie range
 * Example: Between 1800-2200 kcal today, or hit exactly 2000 kcal
 */
export interface CalorieWindowTarget {
  min?: number;           // Minimum calories (optional)
  max?: number;           // Maximum calories (optional)
  exact?: number;         // Exact calorie target (alternative to min/max)
  window?: number;        // Days window (default 1)
}

/**
 * weigh_in: Complete weigh-in(s)
 * Example: Weigh in once this week, or track downward trend over 7 days
 */
export interface WeighInTarget {
  count?: number;         // Number of weigh-ins required (default 1)
  window?: number;        // Days window (default 7)
  trend?: 'down' | 'up';  // Optional: require weight trend direction
}

/**
 * streak_days: Maintain streak of a specific behavior
 * Example: Log at least one meal every day for 7 days straight
 */
export interface StreakDaysTarget {
  days: number;           // Consecutive days required
  rule: 'any_meal' | 'protein_hit' | 'calorie_window' | 'weigh_in'; // Behavior to track
}

/**
 * habit_check: Manual habit completion
 * Example: Prep meals for the week, drink 8 glasses of water
 */
export interface HabitCheckTarget {
  days: number;           // Number of days to complete habit
  habit: string;          // Hebrew description of habit
}

/**
 * edu_read: Read educational content
 * Example: Read article about protein timing
 */
export interface EduReadTarget {
  articleId: string;      // ID of article to read (future: link to content system)
}

/**
 * Union of all task target types
 */
export type TaskTarget =
  | MealLogTarget
  | ProteinTargetTarget
  | CalorieWindowTarget
  | WeighInTarget
  | StreakDaysTarget
  | HabitCheckTarget
  | EduReadTarget;

// ===================================
// Task Template Interface
// ===================================

/**
 * Template definition for a Journey task
 * Used to generate user-specific tasks from config
 */
export interface TaskTemplate {
  id: string;                   // Unique task template ID
  stage_id: string;             // Parent stage ID
  type: TaskType;               // Task type (must be in ALLOWED_TASK_TYPES)
  target: TaskTarget;           // Type-specific target configuration
  points: number;               // Points awarded for completion
  title_he: string;             // Hebrew title
  description_he?: string;      // Optional Hebrew description
  cta_route?: string;           // Optional route for CTA button (e.g., '/nutrition')
  auto_check_fn?: string;       // Optional auto-check function name (e.g., 'checkMealLog')
}

// ===================================
// Type Guards
// ===================================

export function isMealLogTarget(target: TaskTarget): target is MealLogTarget {
  return 'count' in target && !('grams' in target) && !('habit' in target);
}

export function isProteinTargetTarget(target: TaskTarget): target is ProteinTargetTarget {
  return 'grams' in target;
}

export function isCalorieWindowTarget(target: TaskTarget): target is CalorieWindowTarget {
  return ('min' in target || 'max' in target || 'exact' in target);
}

export function isWeighInTarget(target: TaskTarget): target is WeighInTarget {
  return 'trend' in target || ('count' in target && 'window' in target);
}

export function isStreakDaysTarget(target: TaskTarget): target is StreakDaysTarget {
  return 'days' in target && 'rule' in target;
}

export function isHabitCheckTarget(target: TaskTarget): target is HabitCheckTarget {
  return 'habit' in target;
}

export function isEduReadTarget(target: TaskTarget): target is EduReadTarget {
  return 'articleId' in target;
}
