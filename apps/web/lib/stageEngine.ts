/**
 * GymBro Stage Engine
 * Core logic for stage progression, XP awards, and requirement evaluation
 */

export type StageStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export type MetricType =
  | 'meals_logged'
  | 'protein_avg_g'
  | 'calorie_adherence_pct'
  | 'weigh_ins'
  | 'log_streak_days'
  | 'habit_streak_days';

export interface MetricRule {
  metric: MetricType;
  gte?: number;
  lte?: number;
  window_days?: number;
}

export interface Requirements {
  logic: 'AND' | 'OR';
  rules: MetricRule[];
  unlock_any_of?: MetricRule[];
}

export interface UserMetrics {
  meals_logged?: number;
  protein_avg_g?: number;
  calorie_adherence_pct?: number;
  weigh_ins?: number;
  log_streak_days?: number;
  habit_streak_days?: number;
}

export interface Stage {
  code: string;
  order_index: number;
  title_he: string;
  summary_he: string;
  type: 'nutrition' | 'habit' | 'mixed';
  requirements: Requirements;
  xp_reward: number;
  icon: string;
  bg_color: string;
  avatar_id?: string;
}

export interface UserStage {
  id: string;
  user_id: string;
  stage_code: string;
  status: StageStatus;
  progress: number;  // 0-1
  xp_current: number;
  xp_total: number;
  position: number;
  started_at?: string;
  completed_at?: string;
}

export interface EvaluationResult {
  met: boolean;
  partial: number;  // 0-1
  metRules: MetricRule[];
  unmetRules: MetricRule[];
}

/**
 * Check if a single metric rule is satisfied
 */
function evaluateRule(rule: MetricRule, metrics: UserMetrics): boolean {
  const value = metrics[rule.metric];
  if (value === undefined) return false;
  
  if (rule.gte !== undefined && value < rule.gte) return false;
  if (rule.lte !== undefined && value > rule.lte) return false;
  
  return true;
}

/**
 * Evaluate all requirements for a stage
 * Returns: met (boolean) and partial completion (0-1)
 */
export function evaluateRequirements(
  requirements: Requirements,
  metrics: UserMetrics
): EvaluationResult {
  const { logic, rules, unlock_any_of } = requirements;
  
  // Evaluate main rules
  const ruleResults = rules.map(rule => ({
    rule,
    met: evaluateRule(rule, metrics),
  }));
  
  const metRules = ruleResults.filter(r => r.met).map(r => r.rule);
  const unmetRules = ruleResults.filter(r => !r.met).map(r => r.rule);
  
  // Calculate partial progress
  const partial = metRules.length / rules.length;
  
  // Check if requirements are met
  let met = false;
  if (logic === 'AND') {
    met = unmetRules.length === 0;
  } else if (logic === 'OR') {
    met = metRules.length > 0;
  }
  
  // Check unlock_any_of rules (bonus unlock condition)
  if (!met && unlock_any_of && unlock_any_of.length > 0) {
    const anyMet = unlock_any_of.some(rule => evaluateRule(rule, metrics));
    if (anyMet) {
      met = true;
    }
  }
  
  return {
    met,
    partial,
    metRules,
    unmetRules,
  };
}

/**
 * Derive stage state based on previous stage, metrics, and current XP
 * This is the core progression logic
 */
export function deriveStageState(
  userStages: UserStage[],
  stageIndex: number,
  stage: Stage,
  metrics: UserMetrics
): StageStatus {
  const currentStage = userStages[stageIndex];
  const prevStage = stageIndex > 0 ? userStages[stageIndex - 1] : null;
  
  // Already completed
  if (currentStage.completed_at) {
    return 'completed';
  }
  
  // Evaluate requirements
  const evaluation = evaluateRequirements(stage.requirements, metrics);
  
  // Check if XP maxed out (auto-complete even if requirements not fully met)
  const xpComplete = currentStage.xp_current >= currentStage.xp_total;
  
  // If all requirements met OR XP maxed → completed
  if (evaluation.met || xpComplete) {
    return 'completed';
  }
  
  // If partial progress (≥40% rules OR ≥50% XP) → in_progress
  const xpProgress = currentStage.xp_current / currentStage.xp_total;
  if (evaluation.partial >= 0.4 || xpProgress >= 0.5) {
    return 'in_progress';
  }
  
  // If previous stage completed → available
  if (!prevStage || prevStage.status === 'completed') {
    return 'available';
  }
  
  // Otherwise locked
  return 'locked';
}

/**
 * XP award amounts for micro-events (nutrition/habits only)
 */
export const XP_AWARDS = {
  MEAL_LOG: 5,
  PROTEIN_TARGET: 8,
  CALORIE_WINDOW: 7,
  WEIGH_IN: 3,
  STREAK_DAY: 10,
  HABIT_CHECK: 6,
  EDU_READ: 4,
} as const;

/**
 * Calculate new XP (clamped to xp_total)
 */
export function calculateNewXP(
  currentXP: number,
  totalXP: number,
  delta: number
): number {
  return Math.min(currentXP + delta, totalXP);
}

/**
 * Get next actionable steps for a stage
 * Returns user-friendly Hebrew suggestions
 */
export function getNextSteps(
  evaluation: EvaluationResult,
  metrics: UserMetrics
): string[] {
  const steps: string[] = [];

  for (const rule of evaluation.unmetRules) {
    const current = metrics[rule.metric] || 0;
    const target = rule.gte || 0;
    const remaining = target - current;

    switch (rule.metric) {
      case 'meals_logged':
        steps.push(`תעד עוד ${remaining} ארוחה${remaining > 1 ? 'ות' : ''}`);
        break;
      case 'protein_avg_g':
        steps.push(`הגדל את צריכת החלבון ל-${target} גרם ליום`);
        break;
      case 'calorie_adherence_pct':
        steps.push(`שפר את העמידה בקלוריות ל-${target}%`);
        break;
      case 'weigh_ins':
        steps.push(`בצע עוד ${remaining} שקילה${remaining > 1 ? 'ות' : ''} השבוע`);
        break;
      case 'log_streak_days':
        steps.push(`המשך רצף תיעוד - עוד ${remaining} ימים`);
        break;
      case 'habit_streak_days':
        steps.push(`המשך רצף הרגלים - עוד ${remaining} ימים`);
        break;
      default:
        steps.push(`השג ${target} ב${rule.metric}`);
    }
  }

  return steps;
}

/**
 * Initialize user stages on first journey visit
 * Picks 3-5 stages based on avatar
 */
export function selectStagesForUser(
  allStages: Stage[],
  avatarId: string
): Stage[] {
  // Filter stages for this specific avatar
  const avatarStages = allStages
    .filter(stage => stage.avatar_id === avatarId)
    .sort((a, b) => a.order_index - b.order_index);

  return avatarStages;
}

/**
 * Extended Stage interface with avatar_id
 */
export interface ExtendedStage extends Stage {
  avatar_id?: string;
}
