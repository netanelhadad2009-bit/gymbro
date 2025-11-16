/**
 * Journey Compute - Condition Evaluation Logic
 *
 * Evaluates whether a node's conditions are met based on user context and progress.
 */

export interface NodeConditions {
  primary?: string;
  checklist?: string[];
  thresholds?: Record<string, number>;
}

export interface UserContext {
  // Today's data
  weighed_in_today?: boolean;
  meals_logged_today?: number;
  protein_today_g?: number;
  carbs_today_g?: number;
  fat_today_g?: number;
  calories_today?: number;

  // Streak data
  log_streak_days?: number;
  weigh_streak_days?: number;

  // Totals
  total_meals_logged?: number;
  total_weigh_ins?: number;

  // Weekly averages
  avg_protein_weekly?: number;
  avg_calories_weekly?: number;
}

export interface EvaluationResult {
  canComplete: boolean;
  missing: string[];
  satisfied: string[];
}

/**
 * Evaluates a single condition key against user context and thresholds
 */
function evaluateCondition(
  key: string,
  userContext: UserContext,
  thresholds: Record<string, number> = {},
  progressJson: Record<string, any> = {}
): boolean {
  switch (key) {
    // Today's actions
    case "weigh_in_today":
      return userContext.weighed_in_today === true;

    case "log_2_meals":
      return (userContext.meals_logged_today || 0) >= 2;

    case "log_3_meals":
      return (userContext.meals_logged_today || 0) >= 3;

    case "log_4_meals":
      return (userContext.meals_logged_today || 0) >= 4;

    // Nutrition thresholds
    case "protein_min":
      return (userContext.protein_today_g || 0) >= (thresholds.protein_g || 80);

    case "calories_target":
      const targetCal = thresholds.calories || 2000;
      const actualCal = userContext.calories_today || 0;
      // Within 10% of target
      return Math.abs(actualCal - targetCal) <= targetCal * 0.1;

    // Streaks
    case "log_streak_3":
      return (userContext.log_streak_days || 0) >= 3;

    case "log_streak_7":
      return (userContext.log_streak_days || 0) >= 7;

    case "log_streak_14":
      return (userContext.log_streak_days || 0) >= 14;

    case "weigh_streak_7":
      return (userContext.weigh_streak_days || 0) >= 7;

    // Totals
    case "total_meals_10":
      return (userContext.total_meals_logged || 0) >= 10;

    case "total_meals_50":
      return (userContext.total_meals_logged || 0) >= 50;

    case "total_weigh_10":
      return (userContext.total_weigh_ins || 0) >= 10;

    // Weekly averages
    case "avg_protein_weekly":
      return (userContext.avg_protein_weekly || 0) >= (thresholds.protein_g || 100);

    // Custom progress tracking (for complex multi-step tasks)
    case "custom":
      return progressJson.custom_complete === true;

    default:
      console.warn(`[JourneyCompute] Unknown condition key: ${key}`);
      return false;
  }
}

/**
 * Evaluates all conditions for a node
 *
 * @param conditions - The node's conditions_json
 * @param userContext - Aggregated user data (from fn_user_context or similar)
 * @param progressJson - The user's progress_json for this node
 * @returns Evaluation result with canComplete flag and detailed lists
 */
export function evaluateNode(
  conditions: NodeConditions,
  userContext: UserContext,
  progressJson: Record<string, any> = {}
): EvaluationResult {
  const satisfied: string[] = [];
  const missing: string[] = [];

  // Extract condition keys
  const allKeys = new Set<string>();

  if (conditions.primary) {
    allKeys.add(conditions.primary);
  }

  if (conditions.checklist) {
    conditions.checklist.forEach(k => allKeys.add(k));
  }

  // Evaluate each condition
  for (const key of allKeys) {
    const result = evaluateCondition(
      key,
      userContext,
      conditions.thresholds || {},
      progressJson
    );

    if (result) {
      satisfied.push(key);
    } else {
      missing.push(key);
    }
  }

  return {
    canComplete: missing.length === 0,
    missing,
    satisfied
  };
}

/**
 * Helper to generate a user-friendly message about missing conditions
 */
export function getMissingConditionsMessage(missing: string[]): string {
  const messages: Record<string, string> = {
    weigh_in_today: "עדיין לא שקלת את עצמך היום",
    log_2_meals: "עדיין לא תיעדת לפחות 2 ארוחות",
    log_3_meals: "עדיין לא תיעדת לפחות 3 ארוחות",
    log_4_meals: "עדיין לא תיעדת לפחות 4 ארוחות",
    protein_min: "עדיין לא הגעת ליעד החלבון",
    calories_target: "עדיין לא הגעת ליעד הקלוריות",
    log_streak_3: "עדיין לא תיעדת 3 ימים רצופים",
    log_streak_7: "עדיין לא תיעדת 7 ימים רצופים",
    log_streak_14: "עדיין לא תיעדת 14 ימים רצופים",
  };

  return missing.map(key => messages[key] || key).join(", ");
}
