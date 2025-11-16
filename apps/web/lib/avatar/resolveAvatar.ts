import avatarTaxonomy from '../../configs/avatar/AVATAR_TAXONOMY.json';

/**
 * Onboarding answers interface matching questionnaire dimensions
 */
export interface OnboardingAnswers {
  goal?: "gain" | "loss" | "recomp";
  experience?: "never" | "results" | "knowledge" | "time" | "sure";
  frequency?: number; // 2-6
  activity?: "sedentary" | "light" | "high";
  diet?: "none" | "vegan" | "vegetarian" | "keto" | "paleo";
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  gender?: "male" | "female" | "other";
  birthdate?: string;
  target_weight?: number;
  pace?: string;
  readiness?: string;
  motivation?: string;
}

/**
 * Avatar catalog entry from taxonomy
 */
export interface Avatar {
  id: string;
  title: string;
  tagline: string;
  profile_badge: string;
  color_token: string;
  who_is_it_for: string[];
  fit_rules: {
    goal?: string[];
    frequency?: number[];
    experience?: string[];
    diet?: string[];
  };
  kpi_focus: string[];
  training_split_hint: string;
  nutrition_pattern_hint: string;
  tone_of_voice: string;
}

/**
 * Resolved avatar result with confidence and reasoning
 */
export interface ResolvedAvatar {
  avatarId: string;
  confidence: number; // 0-1
  matchedRules: string[];
  reasons: string[];
  score?: number; // Internal scoring for debugging
}

/**
 * Score a single avatar against user answers
 */
function scoreAvatar(avatar: Avatar, answers: OnboardingAnswers): {
  score: number;
  matchedRules: string[];
  reasons: string[];
} {
  let score = 0;
  const matchedRules: string[] = [];
  const reasons: string[] = [];

  const { fit_rules } = avatar;

  // CRITICAL: Goal must match (disqualifying if mismatch)
  if (fit_rules.goal && answers.goal) {
    if (fit_rules.goal.includes(answers.goal)) {
      score += 3;
      matchedRules.push(`goal:${answers.goal}`);
      reasons.push(`מטרה תואמת: ${answers.goal}`);
    } else {
      // Goal mismatch is disqualifying
      score -= 10;
      reasons.push(`מטרה לא תואמת`);
      return { score, matchedRules, reasons };
    }
  }

  // CRITICAL: Diet filter for plant-based avatars
  if (answers.diet && (answers.diet === "vegan" || answers.diet === "vegetarian")) {
    // Plant-based users must match plant-based avatars if avatar has diet rules
    if (fit_rules.diet) {
      if (fit_rules.diet.includes(answers.diet)) {
        score += 3;
        matchedRules.push(`diet:${answers.diet}`);
        reasons.push(`תזונה צמחית מותאמת`);
      } else {
        // Plant-based user, but avatar isn't plant-based
        score -= 2;
        reasons.push(`לא מותאם לתזונה צמחית`);
      }
    } else {
      // Avatar doesn't specify diet rules but user is plant-based
      // Give slight penalty to non-plant avatars
      score -= 1;
    }
  } else {
    // Non-plant-based user
    if (fit_rules.diet && fit_rules.diet.length > 0) {
      // This is a plant-based avatar but user isn't plant-based
      score -= 2;
      reasons.push(`אווטר צמחוני אך המשתמש לא`);
    }
  }

  // High priority: Frequency
  if (fit_rules.frequency && answers.frequency) {
    if (fit_rules.frequency.includes(answers.frequency)) {
      score += 3;
      matchedRules.push(`frequency:${answers.frequency}`);
      reasons.push(`תדירות אימון תואמת: ${answers.frequency}x/שבוע`);
    } else {
      // Check if close (within 1)
      const hasCloseFrequency = fit_rules.frequency.some(
        f => Math.abs(f - answers.frequency!) <= 1
      );
      if (hasCloseFrequency) {
        score += 1;
        matchedRules.push(`frequency:~${answers.frequency}`);
        reasons.push(`תדירות אימון קרובה`);
      } else {
        score -= 2;
        reasons.push(`תדירות אימון לא תואמת`);
      }
    }
  }

  // Moderate priority: Experience
  if (fit_rules.experience && answers.experience) {
    if (fit_rules.experience.includes(answers.experience)) {
      score += 2;
      matchedRules.push(`experience:${answers.experience}`);
      reasons.push(`ניסיון תואם`);
    } else {
      // Soft penalty for experience mismatch
      score -= 1;
    }
  }

  return { score, matchedRules, reasons };
}

/**
 * Calculate confidence score (0-1) based on raw score
 */
function calculateConfidence(score: number, maxPossibleScore: number): number {
  if (score <= 0) return 0;

  // Normalize to 0-1, with diminishing returns at high scores
  const normalized = Math.min(score / maxPossibleScore, 1);

  // Apply sigmoid-like curve for more realistic confidence
  // High scores (9+) get 0.9-1.0
  // Medium scores (5-8) get 0.6-0.8
  // Low scores (1-4) get 0.2-0.5
  if (score >= 9) return Math.min(0.85 + (normalized * 0.15), 1);
  if (score >= 5) return 0.6 + (normalized * 0.25);
  if (score >= 1) return 0.3 + (normalized * 0.3);

  return normalized * 0.3;
}

/**
 * Resolve the best-matching avatar for a user based on onboarding answers
 *
 * @param answers - User's onboarding questionnaire answers
 * @returns ResolvedAvatar with best match, confidence, and reasoning
 */
export function resolveAvatar(answers: OnboardingAnswers): ResolvedAvatar {
  const avatars = avatarTaxonomy.avatars as Avatar[];

  if (!avatars || avatars.length === 0) {
    throw new Error('No avatars found in taxonomy');
  }

  // Score all avatars
  const scoredAvatars = avatars.map(avatar => {
    const { score, matchedRules, reasons } = scoreAvatar(avatar, answers);
    return {
      avatar,
      score,
      matchedRules,
      reasons,
    };
  });

  // Filter out disqualified avatars (negative scores)
  const qualifiedAvatars = scoredAvatars.filter(a => a.score > 0);

  if (qualifiedAvatars.length === 0) {
    // Fallback: Return default avatar with low confidence
    const fallbackId = avatarTaxonomy.metadata.default_fallback;
    return {
      avatarId: fallbackId,
      confidence: 0.1,
      matchedRules: [],
      reasons: ['נמצא אווטר ברירת מחדל - אין התאמה מושלמת'],
      score: 0,
    };
  }

  // Sort by score descending, then by ID for deterministic tie-breaking
  qualifiedAvatars.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Deterministic tie-breaker: alphabetical by ID
    return a.avatar.id.localeCompare(b.avatar.id);
  });

  const bestMatch = qualifiedAvatars[0];

  // Maximum possible score is ~11 (goal:3 + frequency:3 + experience:2 + diet:3)
  const maxPossibleScore = 11;
  const confidence = calculateConfidence(bestMatch.score, maxPossibleScore);

  return {
    avatarId: bestMatch.avatar.id,
    confidence,
    matchedRules: bestMatch.matchedRules,
    reasons: bestMatch.reasons,
    score: bestMatch.score, // Include for debugging
  };
}

/**
 * Get avatar details by ID
 */
export function getAvatarById(avatarId: string): Avatar | null {
  const avatars = avatarTaxonomy.avatars as Avatar[];
  return avatars.find(a => a.id === avatarId) || null;
}

/**
 * Get all available avatars
 */
export function getAllAvatars(): Avatar[] {
  return avatarTaxonomy.avatars as Avatar[];
}
