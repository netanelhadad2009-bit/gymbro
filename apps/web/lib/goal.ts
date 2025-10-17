/**
 * Centralized goal management
 * Single source of truth for goal keys, storage, and display
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import texts from "./assistantTexts";

// ============================================================================
// GOAL ENUM & TYPES
// ============================================================================

export const GOAL_KEYS = ['gain', 'loss', 'recomp'] as const;
export type GoalKey = typeof GOAL_KEYS[number];

const GOAL_LS_KEY = 'onboarding.goal';

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a value is a valid goal key
 */
export function isValidGoalKey(value: unknown): value is GoalKey {
  return typeof value === 'string' && GOAL_KEYS.includes(value as GoalKey);
}

// ============================================================================
// LOCAL STORAGE
// ============================================================================

/**
 * Save goal to localStorage
 */
export function setGoalLocal(goal: GoalKey): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GOAL_LS_KEY, goal);
  } catch (e) {
    console.error('Error saving goal to localStorage:', e);
  }
}

/**
 * Get goal from localStorage
 */
export function getGoalLocal(): GoalKey | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(GOAL_LS_KEY);
    if (value && isValidGoalKey(value)) {
      return value;
    }
  } catch (e) {
    console.error('Error reading goal from localStorage:', e);
  }
  return null;
}

// ============================================================================
// DISPLAY TEXT
// ============================================================================

/**
 * Convert goal key to Hebrew display text
 */
export function goalToDisplay(goal: GoalKey | null | undefined, lang: 'he' | 'en' = 'he'): string {
  if (!goal || !isValidGoalKey(goal)) return '—';

  const langTexts = texts;
  return langTexts.goals[goal] || '—';
}

// ============================================================================
// SUPABASE PERSISTENCE
// ============================================================================

/**
 * Save goal to profiles table in Supabase
 */
export async function saveGoalToProfile(
  supabase: SupabaseClient,
  userId: string,
  goal: GoalKey
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        goal,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      });

    if (error) {
      console.error('Error saving goal to profile:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error('Error saving goal to profile:', e);
    return { success: false, error: String(e) };
  }
}

// ============================================================================
// GOAL RESOLUTION
// ============================================================================

/**
 * Resolve goal from multiple sources with priority order
 * Priority: programGoal > profileGoal > metadataGoal > localGoal
 */
export async function resolveGoal({
  programGoal,
  profileGoal,
  metadataGoal,
  localGoal,
}: {
  programGoal?: string | null;
  profileGoal?: string | null;
  metadataGoal?: string | null;
  localGoal?: string | null;
}): Promise<GoalKey | null> {
  // Check each source in priority order
  const candidates = [
    programGoal,
    profileGoal,
    metadataGoal,
    localGoal,
  ];

  for (const candidate of candidates) {
    if (candidate && isValidGoalKey(candidate)) {
      return candidate;
    }
  }

  return null;
}

// ============================================================================
// MIGRATION HELPER
// ============================================================================

/**
 * Migrate goal from localStorage to profile on login
 */
export async function migrateGoalOnLogin(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    // Get local goal
    const localGoal = getGoalLocal();
    if (!localGoal) return;

    // Check if profile already has a goal
    const { data: profile } = await supabase
      .from('profiles')
      .select('goal')
      .eq('id', userId)
      .maybeSingle();

    // Only migrate if profile doesn't have a goal
    if (!profile?.goal) {
      await saveGoalToProfile(supabase, userId, localGoal);
      console.log('✅ Migrated goal from localStorage to profile:', localGoal);
    }
  } catch (e) {
    console.error('Error migrating goal on login:', e);
  }
}
