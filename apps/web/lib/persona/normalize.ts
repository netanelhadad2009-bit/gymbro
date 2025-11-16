/**
 * Persona Attribute Normalization
 *
 * Ensures all persona attributes match canonical database CHECK constraints.
 * Maps common variations and user inputs to valid enum values.
 */

export type CanonicalExperience = 'beginner' | 'intermediate' | 'advanced' | 'knowledge' | 'time';

/**
 * Normalize experience level to canonical value
 *
 * @param input - Raw experience value from user input or metadata
 * @returns Canonical experience value that matches DB CHECK constraint
 *
 * @example
 * normalizeExperience('results') // => 'knowledge'
 * normalizeExperience('novice') // => 'beginner'
 * normalizeExperience(undefined) // => 'beginner'
 */
export function normalizeExperience(input?: string | null): CanonicalExperience {
  const v = (input || '').toLowerCase().trim();

  // Knowledge/theory-based
  if (['results', 'outcomes', 'progress'].includes(v)) return 'knowledge';
  if (['knowledge', 'theory', 'learn'].includes(v)) return 'knowledge';

  // Beginner variations
  if (['novice', 'newbie', 'starter', 'beginner'].includes(v)) return 'beginner';

  // Intermediate variations
  if (['mid', 'intermediate'].includes(v)) return 'intermediate';

  // Advanced variations
  if (['expert', 'pro', 'advanced'].includes(v)) return 'advanced';

  // Time-constrained
  if (['busy', 'no_time', 'time'].includes(v)) return 'time';

  // Default fallback
  console.warn(`[Normalize] Unknown experience "${input}", defaulting to "beginner"`);
  return 'beginner';
}

export type CanonicalFrequency = 'low' | 'medium' | 'high';

/**
 * Normalize training frequency to canonical value
 *
 * @param input - Raw frequency value
 * @returns Canonical frequency value
 */
export function normalizeFrequency(input?: string | null): CanonicalFrequency {
  const v = (input || '').toLowerCase().trim();

  if (['low', 'light', 'rare', '1', '2'].includes(v)) return 'low';
  if (['medium', 'med', 'moderate', '3', '4'].includes(v)) return 'medium';
  if (['high', 'often', 'frequent', '5', '6', '7'].includes(v)) return 'high';

  // Default fallback
  console.warn(`[Normalize] Unknown frequency "${input}", defaulting to "medium"`);
  return 'medium';
}

export type CanonicalDiet = 'vegan' | 'keto' | 'balanced' | 'vegetarian' | 'paleo' | 'none';

/**
 * Normalize diet type to canonical value
 *
 * @param input - Raw diet value
 * @returns Canonical diet value
 */
export function normalizeDiet(input?: string | null): CanonicalDiet {
  const v = (input || '').toLowerCase().trim();

  if (['vegan', 'plant', 'plant_based'].includes(v)) return 'vegan';
  if (['keto', 'ketogenic'].includes(v)) return 'keto';
  if (['vegetarian', 'veggie'].includes(v)) return 'vegetarian';
  if (['paleo', 'paleolithic'].includes(v)) return 'paleo';
  if (['balanced', 'normal', 'standard', 'regular'].includes(v)) return 'balanced';
  if (['none', 'no', 'any'].includes(v)) return 'none';

  // Default fallback
  console.warn(`[Normalize] Unknown diet "${input}", defaulting to "balanced"`);
  return 'balanced';
}

export type CanonicalGoal = 'loss' | 'bulk' | 'recomp' | 'cut';

/**
 * Normalize fitness goal to canonical value
 *
 * @param input - Raw goal value
 * @returns Canonical goal value
 */
export function normalizeGoal(input?: string | null): CanonicalGoal {
  const v = (input || '').toLowerCase().trim();

  if (['loss', 'weight_loss', 'lose'].includes(v)) return 'loss';
  if (['cut', 'cutting', 'shred'].includes(v)) return 'cut';
  if (['bulk', 'bulking', 'gain', 'mass'].includes(v)) return 'bulk';
  if (['recomp', 'recomposition', 'maintain', 'tone', 'body_recomp'].includes(v)) return 'recomp';

  // Default fallback
  console.warn(`[Normalize] Unknown goal "${input}", defaulting to "recomp"`);
  return 'recomp';
}

export type CanonicalGender = 'male' | 'female';

/**
 * Normalize gender to canonical value
 *
 * @param input - Raw gender value
 * @returns Canonical gender value
 */
export function normalizeGender(input?: string | null): CanonicalGender {
  const v = (input || '').toLowerCase().trim();

  if (v === 'female' || v === 'f' || v === 'woman') return 'female';
  if (v === 'male' || v === 'm' || v === 'man') return 'male';

  // Default fallback
  console.warn(`[Normalize] Unknown gender "${input}", defaulting to "male"`);
  return 'male';
}

/**
 * Normalize all persona attributes at once
 *
 * @param raw - Raw persona data from various sources
 * @returns Normalized persona with canonical values
 */
export function normalizePersona(raw: {
  gender?: string | null;
  goal?: string | null;
  diet?: string | null;
  frequency?: string | null;
  experience?: string | null;
}): {
  gender: CanonicalGender;
  goal: CanonicalGoal;
  diet: CanonicalDiet;
  frequency: CanonicalFrequency;
  experience: CanonicalExperience;
} {
  return {
    gender: normalizeGender(raw.gender),
    goal: normalizeGoal(raw.goal),
    diet: normalizeDiet(raw.diet),
    frequency: normalizeFrequency(raw.frequency),
    experience: normalizeExperience(raw.experience),
  };
}
