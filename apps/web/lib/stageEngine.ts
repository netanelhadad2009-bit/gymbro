/**
 * GymBro Stage Engine
 * Core logic for stage progression, XP awards, and requirement evaluation
 */

export type StageStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export type MetricType =
  | 'workouts_per_week'
  | 'nutrition_adherence_pct'
  | 'weigh_ins'
  | 'protein_avg_g'
  | 'cardio_minutes'
  | 'log_streak_days'
  | 'upper_body_workouts'
  | 'kcal_deficit_avg'
  | 'steps_avg';

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
  workouts_per_week?: number;
  nutrition_adherence_pct?: number;
  weigh_ins?: number;
  protein_avg_g?: number;
  cardio_minutes?: number;
  log_streak_days?: number;
  upper_body_workouts?: number;
  kcal_deficit_avg?: number;
  steps_avg?: number;
}

export interface Stage {
  code: string;
  order_index: number;
  title_he: string;
  summary_he: string;
  type: 'workout' | 'nutrition' | 'habit' | 'mixed';
  requirements: Requirements;
  xp_reward: number;
  icon: string;
  bg_color: string;
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
 * XP award amounts for micro-events
 */
export const XP_AWARDS = {
  WORKOUT: 10,
  NUTRITION_DAY: 5,
  WEIGH_IN: 2,
  CARDIO_SESSION: 8,
  STREAK_DAY: 3,
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
  stage: Stage,
  evaluation: EvaluationResult,
  metrics: UserMetrics
): string[] {
  const steps: string[] = [];
  
  for (const rule of evaluation.unmetRules) {
    const current = metrics[rule.metric] || 0;
    const target = rule.gte || 0;
    const remaining = target - current;
    
    switch (rule.metric) {
      case 'workouts_per_week':
        steps.push(`נותר לך ${remaining} אימון${remaining > 1 ? 'ים' : ''} השבוע`);
        break;
      case 'nutrition_adherence_pct':
        steps.push(`שפר את העמידה בתזונה ל-${target}%`);
        break;
      case 'weigh_ins':
        steps.push(`בצע עוד ${remaining} שקילה השבוע`);
        break;
      case 'protein_avg_g':
        steps.push(`הגדל את צריכת החלבון ל-${target} גרם ליום`);
        break;
      case 'cardio_minutes':
        steps.push(`נותרו ${remaining} דקות קרדיו השבוע`);
        break;
      case 'log_streak_days':
        steps.push(`המשך רצף תיעוד - עוד ${remaining} ימים`);
        break;
      default:
        steps.push(`השג ${target} ב${rule.metric}`);
    }
  }
  
  return steps;
}

/**
 * Initialize user stages on first journey visit
 * Picks 5-8 stages based on user goal/level
 */
export function selectStagesForUser(
  allStages: Stage[],
  userGoal: 'bulk' | 'cut' | 'recomp',
  userLevel: number
): Stage[] {
  // Beginners: 5 stages, Advanced: 8 stages
  const stageCount = userLevel <= 1 ? 5 : userLevel === 2 ? 6 : 8;
  
  // Filter relevant stages (could add goal-specific filtering here)
  const relevantStages = allStages
    .sort((a, b) => a.order_index - b.order_index);
  
  return relevantStages.slice(0, stageCount);
}
