/**
 * Workout Plan Validator V3
 *
 * Validates JSON workout plans with soft validation mode
 * - Soft mode (default): Auto-correct minor issues and return warnings
 * - Hard mode: Throw on all validation failures
 */

import { z } from "zod";

// ==================== ZOD SCHEMAS ====================

const ExerciseSchema = z.object({
  name_he: z.string().min(1, "Exercise name cannot be empty"),
  sets: z.number().int().min(2).max(4, "Sets must be between 2-4"),
  reps: z.string().regex(/^\d+-\d+( שניות)?$/, "Reps must be in format '8-12' or '30-45 שניות'"),
  rest_seconds: z.number().int().min(30).max(240, "Rest must be between 30-240 seconds"),
  tempo: z.string().regex(/^\d-\d-\d$|^החזק$/, "Tempo must be in format '2-0-2' or 'החזק'"),
  target_muscles: z.array(z.string()).min(1).max(4, "Target muscles must be 1-4 items"),
  order: z.number().int().min(1).max(10, "Order must be between 1-10"),
  id: z.string().nullable()
});

const DaySchema = z.object({
  day_name: z.string().min(1, "Day name cannot be empty"),
  order: z.number().int().min(1),
  muscles_focus: z.array(z.string()).min(1).max(5, "Muscles focus must be 1-5 items"),
  total_sets: z.number().int().min(1).max(25, "Total sets must be between 1-25"),
  exercises: z.array(ExerciseSchema).min(4).max(10, "Exercises must be 4-10 per day")
});

const PlanSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  goal: z.enum(["mass", "cut", "strength"], {
    message: "Goal must be 'mass', 'cut', or 'strength'"
  }),
  days_per_week: z.number().int().min(2).max(7, "Days per week must be 2-7"),
  plan: z.array(DaySchema)
});

export type Exercise = z.infer<typeof ExerciseSchema>;
export type Day = z.infer<typeof DaySchema>;
export type Plan = z.infer<typeof PlanSchema>;

// ==================== VALIDATION OPTIONS ====================

export interface ValidationOptions {
  goal: "mass" | "cut" | "strength";
  daysPerWeek: number;
  soft?: boolean; // Default: true - auto-correct instead of throwing on minor issues
}

export interface ValidationResult {
  plan: Plan;
  warnings: string[];
}

// Environment flag for soft validation (default: true)
const SOFT_VALIDATE = process.env.WORKOUT_SOFT_VALIDATE !== 'false';

console.log(`🔧 Validation mode: ${SOFT_VALIDATE ? 'SOFT (auto-correct)' : 'HARD (strict)'}`);

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract numeric range from reps string (e.g., "8-12" -> [8, 12])
 */
function parseRepsRange(reps: string): [number, number] | null {
  const match = reps.match(/^(\d+)-(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10)];
}

/**
 * Check if exercise is an abs/core exercise (typically higher reps)
 */
function isAbsExercise(exercise: Exercise): boolean {
  const absKeywords = ["בטן", "ליבה", "פלאנק", "קור", "abs", "core", "plank"];
  const nameLower = exercise.name_he.toLowerCase();
  const musclesLower = (exercise.target_muscles || []).map(m => m.toLowerCase());

  return absKeywords.some(keyword =>
    nameLower.includes(keyword) || musclesLower.some(m => m.includes(keyword))
  );
}

// ==================== SOFT VALIDATION FUNCTIONS ====================

/**
 * Validate and auto-correct total_sets if in soft mode
 */
function validateTotalSets(day: Day, softMode: boolean, warnings: string[]): void {
  const sumSets = day.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  if (sumSets !== day.total_sets) {
    if (softMode) {
      const originalSets = day.total_sets;
      day.total_sets = Math.min(sumSets, 25); // Clamp to 25
      warnings.push(
        `Day "${day.day_name}" (order ${day.order}): total_sets was ${originalSets}, auto-corrected to ${day.total_sets} (sum of exercise sets)`
      );
    } else {
      throw new Error(
        `Day "${day.day_name}" (order ${day.order}): total_sets is ${day.total_sets} but sum of exercise sets is ${sumSets}`
      );
    }
  }
}

/**
 * Validate rep ranges with soft mode (allow slightly out-of-range values)
 */
function validateRepRanges(day: Day, goal: "mass" | "cut" | "strength", softMode: boolean, warnings: string[]): void {
  const goalRanges: Record<"mass" | "cut" | "strength", { min: number; max: number }> = {
    cut: { min: 12, max: 15 },
    mass: { min: 8, max: 12 },
    strength: { min: 5, max: 8 }
  };

  const targetRange = goalRanges[goal];

  for (const exercise of day.exercises) {
    // Skip abs/core exercises - they can have higher reps (15-20)
    if (isAbsExercise(exercise)) {
      continue;
    }

    const range = parseRepsRange(exercise.reps);
    if (!range) continue; // Skip non-numeric reps (e.g., "30-45 שניות")

    const [minReps, maxReps] = range;

    // Check if reps are within target range
    const inRange = minReps >= targetRange.min && maxReps <= targetRange.max;

    if (!inRange) {
      if (softMode) {
        // Allow slight variations in soft mode
        const closeEnough = (
          (goal === "cut" && minReps >= 10 && maxReps <= 18) ||
          (goal === "mass" && minReps >= 6 && maxReps <= 15) ||
          (goal === "strength" && minReps >= 3 && maxReps <= 12)
        );

        if (closeEnough) {
          warnings.push(
            `Day "${day.day_name}": Exercise "${exercise.name_he}" has reps ${exercise.reps} (slightly outside ${targetRange.min}-${targetRange.max} for ${goal})`
          );
        } else {
          warnings.push(
            `Day "${day.day_name}": Exercise "${exercise.name_he}" has reps ${exercise.reps} (significantly outside expected ${targetRange.min}-${targetRange.max} for ${goal})`
          );
        }
      } else {
        throw new Error(
          `Day "${day.day_name}": Exercise "${exercise.name_he}" has invalid reps ${exercise.reps} for goal "${goal}". ` +
          `Expected ${targetRange.min}-${targetRange.max}.`
        );
      }
    }
  }
}

/**
 * Validate and auto-correct day orders
 */
function validateDayOrders(plan: Plan, expectedDays: number, softMode: boolean, warnings: string[]): void {
  // Hard error: wrong number of days
  if (plan.plan.length === 0) {
    throw new Error(`Plan has 0 days - cannot generate workout`);
  }

  if (plan.plan.length !== expectedDays) {
    if (!softMode) {
      throw new Error(`Expected ${expectedDays} days but got ${plan.plan.length}`);
    }
    warnings.push(`Expected ${expectedDays} days but got ${plan.plan.length}`);
  }

  const orders = plan.plan.map(d => d.order);
  const expectedOrders = Array.from({ length: expectedDays }, (_, i) => i + 1);

  // Check if orders are consecutive
  const sortedOrders = [...orders].sort((a, b) => a - b);
  if (JSON.stringify(sortedOrders) !== JSON.stringify(expectedOrders)) {
    if (softMode) {
      // Auto-correct: renumber days in ascending order
      plan.plan.forEach((day, index) => {
        const originalOrder = day.order;
        day.order = index + 1;
        if (originalOrder !== day.order) {
          warnings.push(
            `Day "${day.day_name}": order was ${originalOrder}, auto-corrected to ${day.order}`
          );
        }
      });
    } else {
      throw new Error(
        `Day orders must be consecutive from 1 to ${expectedDays}. Got: ${orders.join(", ")}`
      );
    }
  }
}

/**
 * Validate and auto-correct exercise orders within a day
 */
function validateExerciseOrders(day: Day, softMode: boolean, warnings: string[]): void {
  const orders = day.exercises.map(e => e.order);
  const expectedOrders = Array.from({ length: day.exercises.length }, (_, i) => i + 1);

  const sortedOrders = [...orders].sort((a, b) => a - b);
  if (JSON.stringify(sortedOrders) !== JSON.stringify(expectedOrders)) {
    if (softMode) {
      // Auto-correct: renumber exercises in their current order
      day.exercises.forEach((exercise, index) => {
        const originalOrder = exercise.order;
        exercise.order = index + 1;
        if (originalOrder !== exercise.order) {
          warnings.push(
            `Day "${day.day_name}", Exercise "${exercise.name_he}": order was ${originalOrder}, auto-corrected to ${exercise.order}`
          );
        }
      });
    } else {
      throw new Error(
        `Day "${day.day_name}": Exercise orders must be consecutive from 1 to ${day.exercises.length}. ` +
        `Got: ${orders.join(", ")}`
      );
    }
  }
}

// ==================== PREPROCESSING ====================

/**
 * Normalize reps and tempo formats before Zod validation
 * This allows the LLM to use slightly different formats that we can auto-correct
 */
function preprocessPlan(data: any, softMode: boolean, warnings: string[]): any {
  if (!softMode || !data?.plan) return data;

  // Deep clone to avoid mutating original
  const normalized = JSON.parse(JSON.stringify(data));

  for (const day of normalized.plan || []) {
    for (const exercise of day.exercises || []) {
      // Normalize reps: "8–12" (em dash) -> "8-12" (hyphen)
      // Also handle "8 - 12" (spaces) -> "8-12"
      // Also handle "8 to 12" -> "8-12"
      if (typeof exercise.reps === 'string') {
        const originalReps = exercise.reps;
        exercise.reps = exercise.reps
          .replace(/–/g, '-')  // em dash to hyphen
          .replace(/\s*-\s*/g, '-')  // remove spaces around hyphen
          .replace(/\s+to\s+/gi, '-')  // "8 to 12" -> "8-12"
          .trim();

        if (originalReps !== exercise.reps) {
          warnings.push(
            `Normalized reps "${originalReps}" -> "${exercise.reps}" for exercise "${exercise.name_he}"`
          );
        }
      }

      // Normalize tempo: "2–0–2" (em dash) -> "2-0-2" (hyphen)
      // Also handle "2 - 0 - 2" (spaces) -> "2-0-2"
      // Also handle various formats like "Hold", "hold", "החזק", etc.
      if (typeof exercise.tempo === 'string') {
        const originalTempo = exercise.tempo;
        const tempo = exercise.tempo.trim();

        // Check if it's a "hold" instruction
        if (/^hold$/i.test(tempo) || tempo === 'החזק') {
          exercise.tempo = 'החזק';
        } else {
          // Normalize dashes
          exercise.tempo = tempo
            .replace(/–/g, '-')  // em dash to hyphen
            .replace(/\s*-\s*/g, '-')  // remove spaces around hyphen
            .trim();
        }

        if (originalTempo !== exercise.tempo) {
          warnings.push(
            `Normalized tempo "${originalTempo}" -> "${exercise.tempo}" for exercise "${exercise.name_he}"`
          );
        }
      }
    }
  }

  return normalized;
}

// ==================== MAIN VALIDATOR ====================

/**
 * Validate workout plan with schema and business rules
 *
 * In soft mode (default):
 * - Auto-corrects minor issues (total_sets, exercise orders, day orders)
 * - Returns warnings instead of throwing
 * - Only throws on critical errors (0 days, schema violations, etc.)
 *
 * In hard mode:
 * - Throws on all validation failures
 *
 * @returns {ValidationResult} validated plan with warnings
 * @throws {Error} on critical validation failures
 */
export function validatePlanOrThrow(json: unknown, options: ValidationOptions): ValidationResult {
  const warnings: string[] = [];
  const softMode = options.soft !== undefined ? options.soft : SOFT_VALIDATE;

  // 0. Preprocess: Normalize reps and tempo formats BEFORE Zod validation
  const normalizedJson = preprocessPlan(json, softMode, warnings);

  // 1. Schema validation (HARD ERROR - always throw)
  let plan: Plan;
  try {
    plan = PlanSchema.parse(normalizedJson);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join("; ");
      throw new Error(`Schema validation failed: ${messages}`);
    }
    throw error;
  }

  // 2. Validate goal matches (soft error in soft mode)
  if (plan.goal !== options.goal) {
    if (softMode) {
      warnings.push(`Plan goal "${plan.goal}" doesn't match expected goal "${options.goal}", using LLM goal`);
    } else {
      throw new Error(`Plan goal "${plan.goal}" doesn't match expected goal "${options.goal}"`);
    }
  }

  // 3. Validate days_per_week matches (soft error in soft mode)
  if (plan.days_per_week !== options.daysPerWeek) {
    if (softMode) {
      warnings.push(
        `Plan days_per_week ${plan.days_per_week} doesn't match expected ${options.daysPerWeek}, using LLM value`
      );
    } else {
      throw new Error(
        `Plan days_per_week ${plan.days_per_week} doesn't match expected ${options.daysPerWeek}`
      );
    }
  }

  // 4. Validate and auto-correct day orders
  validateDayOrders(plan, options.daysPerWeek, softMode, warnings);

  // 5. Validate each day
  for (const day of plan.plan) {
    // Hard error: less than 6 or more than 10 exercises
    if (day.exercises.length < 6 || day.exercises.length > 10) {
      throw new Error(
        `Day "${day.day_name}" has ${day.exercises.length} exercises. Must be 6-10 per day.`
      );
    }

    // Total sets validation (auto-correct in soft mode)
    validateTotalSets(day, softMode, warnings);

    // Exercise order validation (auto-correct in soft mode)
    validateExerciseOrders(day, softMode, warnings);

    // Rep ranges validation (warn in soft mode)
    validateRepRanges(day, options.goal, softMode, warnings);

    // Hard error: day exceeds 25 sets
    if (day.total_sets > 25) {
      throw new Error(`Day "${day.day_name}" has ${day.total_sets} sets, exceeds maximum of 25`);
    }

    // Hard error: exercise sets outside 2-4 range
    for (const exercise of day.exercises) {
      if (exercise.sets < 2 || exercise.sets > 4) {
        throw new Error(
          `Day "${day.day_name}": Exercise "${exercise.name_he}" has ${exercise.sets} sets. Must be 2-4.`
        );
      }
    }
  }

  return { plan, warnings };
}
