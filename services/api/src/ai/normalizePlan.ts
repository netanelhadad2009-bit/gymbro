/**
 * Plan Normalization Layer
 *
 * Normalizes LLM-generated workout plans BEFORE validation to handle common format variations.
 * This allows the LLM more flexibility while still maintaining strict validation rules.
 */

export interface NormalizationParams {
  goal: string; // Original goal from user (can be Hebrew or English)
  workoutsPerWeek: number;
}

export interface NormalizationResult {
  plan: any;
  warnings: string[];
}

// Goal mapping: Hebrew/English → enum
const GOAL_MAP: Record<string, 'mass' | 'cut' | 'strength'> = {
  // Mass/Muscle building
  'העלאת מסת שריר': 'mass',
  'מסה': 'mass',
  'היפרטרופיה': 'mass',
  'muscle_gain': 'mass',
  'gain': 'mass',
  'bulk': 'mass',
  'hypertrophy': 'mass',

  // Cut/Fat loss
  'שריפת שומן': 'cut',
  'חיטוב': 'cut',
  'ירידה במשקל': 'cut',
  'weight_loss': 'cut',
  'loss': 'cut',
  'cut': 'cut',
  'shred': 'cut',

  // Strength
  'כוח': 'strength',
  'כוח מרבי': 'strength',
  'strength': 'strength',
  'power': 'strength',

  // Maintenance
  'body_maintenance': 'cut', // Default to cut for maintenance
  'maintenance': 'cut',
};

// Default rep ranges by goal
const DEFAULT_REPS_BY_GOAL: Record<string, string> = {
  'mass': '8-12',
  'cut': '12-15',
  'strength': '5-8',
};

// Ab/core exercise keywords
const ABS_KEYWORDS = ['בטן', 'ליבה', 'פלאנק', 'plank', 'hollow', 'dead bug', 'core', 'abs'];

/**
 * Check if an exercise is an abs/core exercise
 */
function isAbsExercise(exerciseName: string, targetMuscles: string[]): boolean {
  const nameLower = exerciseName.toLowerCase();
  const musclesLower = targetMuscles.map(m => m.toLowerCase());

  return ABS_KEYWORDS.some(keyword =>
    nameLower.includes(keyword) || musclesLower.some(m => m.includes(keyword))
  );
}

/**
 * Normalize goal to enum value
 */
function normalizeGoal(goal: string, fallback: string): 'mass' | 'cut' | 'strength' {
  const goalLower = (goal || '').toLowerCase().trim();

  // Try direct mapping
  if (GOAL_MAP[goalLower]) {
    return GOAL_MAP[goalLower];
  }

  // Try fallback mapping
  const fallbackLower = (fallback || '').toLowerCase().trim();
  if (GOAL_MAP[fallbackLower]) {
    return GOAL_MAP[fallbackLower];
  }

  // Default to mass if no mapping found
  return 'mass';
}

/**
 * Normalize tempo format
 */
function normalizeTempo(tempo: any): string {
  if (typeof tempo !== 'string') {
    return '2-0-2'; // Default
  }

  const tempoTrimmed = tempo.trim();

  // Check for "hold" variations
  if (/^hold$/i.test(tempoTrimmed) ||
      tempoTrimmed === 'החזק' ||
      tempoTrimmed === 'החזקה' ||
      tempoTrimmed.includes('החזק/')) {
    return 'החזק';
  }

  // Normalize separators: em-dash, spaces, dots, slashes → hyphen
  let normalized = tempoTrimmed
    .replace(/–/g, '-')  // em dash
    .replace(/\s+/g, '-')  // spaces
    .replace(/\./g, '-')  // dots
    .replace(/\//g, '-')  // slashes
    .replace(/-+/g, '-');  // multiple hyphens → single

  // Handle "202" → "2-0-2"
  if (/^\d{3}$/.test(normalized)) {
    normalized = `${normalized[0]}-${normalized[1]}-${normalized[2]}`;
  }

  // Validate final format
  if (/^\d-\d-\d$/.test(normalized)) {
    return normalized;
  }

  // Default fallback
  return '2-0-2';
}

/**
 * Normalize reps format
 */
function normalizeReps(reps: any, goal: string, isAbs: boolean): string {
  if (typeof reps !== 'string') {
    return DEFAULT_REPS_BY_GOAL[goal] || '8-12';
  }

  const repsTrimmed = reps.trim();

  // Already in correct format with range
  if (/^\d+-\d+( שניות)?$/.test(repsTrimmed)) {
    return repsTrimmed;
  }

  // Normalize separators
  let normalized = repsTrimmed
    .replace(/–/g, '-')  // em dash
    .replace(/\s*-\s*/g, '-')  // spaces around hyphen
    .replace(/\s+to\s+/gi, '-')  // "8 to 12"
    .trim();

  // Check if now valid
  if (/^\d+-\d+( שניות)?$/.test(normalized)) {
    return normalized;
  }

  // Single number - expand to range
  const singleMatch = normalized.match(/^(\d+)$/);
  if (singleMatch) {
    const num = parseInt(singleMatch[1], 10);

    // For abs, use higher reps
    if (isAbs) {
      return '15-20';
    }

    // Otherwise use goal-based range
    return DEFAULT_REPS_BY_GOAL[goal] || '8-12';
  }

  // Default fallback
  return DEFAULT_REPS_BY_GOAL[goal] || '8-12';
}

/**
 * Infer muscles_focus from exercises target_muscles
 */
function inferMusclesFocus(exercises: any[]): string[] {
  const muscleCount: Record<string, number> = {};

  for (const exercise of exercises) {
    if (Array.isArray(exercise.target_muscles)) {
      for (const muscle of exercise.target_muscles) {
        if (typeof muscle === 'string' && muscle.trim()) {
          const key = muscle.trim();
          muscleCount[key] = (muscleCount[key] || 0) + 1;
        }
      }
    }
  }

  // Sort by frequency and take top 3
  const sorted = Object.entries(muscleCount)
    .sort((a, b) => b[1] - a[1])
    .map(([muscle]) => muscle)
    .slice(0, 3);

  return sorted.length > 0 ? sorted : ['גוף מלא'];
}

/**
 * Normalize entire plan
 */
export function normalizePlan(rawPlan: any, params: NormalizationParams): NormalizationResult {
  const warnings: string[] = [];

  // Deep clone to avoid mutating original
  const plan = JSON.parse(JSON.stringify(rawPlan));

  // 1. Normalize goal
  const originalGoal = plan.goal;
  plan.goal = normalizeGoal(plan.goal, params.goal);
  if (originalGoal !== plan.goal) {
    warnings.push(`Goal normalized: "${originalGoal}" → "${plan.goal}"`);
  }

  // 2. Normalize days_per_week
  if (typeof plan.days_per_week !== 'number') {
    plan.days_per_week = params.workoutsPerWeek;
    warnings.push(`days_per_week set to ${params.workoutsPerWeek}`);
  }

  // 3. Process each day
  if (Array.isArray(plan.plan)) {
    // Renumber days
    plan.plan.forEach((day: any, index: number) => {
      const expectedOrder = index + 1;
      if (day.order !== expectedOrder) {
        warnings.push(`Day "${day.day_name}" order corrected: ${day.order} → ${expectedOrder}`);
        day.order = expectedOrder;
      }

      // 4. Normalize muscles_focus
      if (!Array.isArray(day.muscles_focus)) {
        day.muscles_focus = [];
      }

      // Trim, remove empties/duplicates, limit to 5
      day.muscles_focus = Array.from(new Set(
        day.muscles_focus
          .map((m: any) => typeof m === 'string' ? m.trim() : '')
          .filter((m: string) => m.length > 0)
      )).slice(0, 5);

      // If empty, infer from exercises
      if (day.muscles_focus.length === 0 && Array.isArray(day.exercises)) {
        day.muscles_focus = inferMusclesFocus(day.exercises);
        warnings.push(`Day "${day.day_name}" muscles_focus inferred: [${day.muscles_focus.join(', ')}]`);
      }

      // Ensure 1-5 items
      if (day.muscles_focus.length === 0) {
        day.muscles_focus = ['גוף מלא'];
        warnings.push(`Day "${day.day_name}" muscles_focus defaulted to ['גוף מלא']`);
      }

      // 5. Process exercises
      if (Array.isArray(day.exercises)) {
        day.exercises.forEach((exercise: any, exIndex: number) => {
          const expectedOrder = exIndex + 1;
          if (exercise.order !== expectedOrder) {
            exercise.order = expectedOrder;
          }

          // Ensure id field exists (set to null if missing/undefined)
          if (exercise.id === undefined) {
            exercise.id = null;
          }

          // Normalize sets (clamp to 2-4)
          if (typeof exercise.sets !== 'number') {
            exercise.sets = 3; // Default
            warnings.push(`Exercise "${exercise.name_he}" sets defaulted to 3`);
          } else {
            const originalSets = exercise.sets;
            exercise.sets = Math.round(Math.max(2, Math.min(4, exercise.sets)));
            if (originalSets !== exercise.sets) {
              warnings.push(`Exercise "${exercise.name_he}" sets clamped: ${originalSets} → ${exercise.sets}`);
            }
          }

          // Check if abs exercise
          const isAbs = isAbsExercise(
            exercise.name_he || '',
            Array.isArray(exercise.target_muscles) ? exercise.target_muscles : []
          );

          // Normalize reps
          const originalReps = exercise.reps;
          exercise.reps = normalizeReps(exercise.reps, plan.goal, isAbs);
          if (originalReps !== exercise.reps) {
            warnings.push(`Exercise "${exercise.name_he}" reps normalized: "${originalReps}" → "${exercise.reps}"`);
          }

          // Normalize tempo
          const originalTempo = exercise.tempo;
          exercise.tempo = normalizeTempo(exercise.tempo);
          if (originalTempo !== exercise.tempo) {
            warnings.push(`Exercise "${exercise.name_he}" tempo normalized: "${originalTempo}" → "${exercise.tempo}"`);
          }

          // Normalize rest_seconds (clamp to 30-240)
          if (typeof exercise.rest_seconds !== 'number') {
            exercise.rest_seconds = 60; // Default
            warnings.push(`Exercise "${exercise.name_he}" rest_seconds defaulted to 60`);
          } else {
            const originalRest = exercise.rest_seconds;
            exercise.rest_seconds = Math.round(Math.max(30, Math.min(240, exercise.rest_seconds)));
            if (originalRest !== exercise.rest_seconds) {
              warnings.push(`Exercise "${exercise.name_he}" rest_seconds clamped: ${originalRest} → ${exercise.rest_seconds}`);
            }
          }

          // Ensure target_muscles is array
          if (!Array.isArray(exercise.target_muscles)) {
            exercise.target_muscles = ['גוף מלא'];
            warnings.push(`Exercise "${exercise.name_he}" target_muscles defaulted to ['גוף מלא']`);
          }
        });

        // 6. Recompute total_sets
        const computedTotalSets = day.exercises.reduce((sum: number, ex: any) => sum + (ex.sets || 0), 0);
        const clampedTotalSets = Math.min(computedTotalSets, 25);

        if (day.total_sets !== clampedTotalSets) {
          warnings.push(`Day "${day.day_name}" total_sets recomputed: ${day.total_sets} → ${clampedTotalSets}`);
          day.total_sets = clampedTotalSets;
        }
      }
    });
  }

  return { plan, warnings };
}
