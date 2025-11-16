/**
 * User Nutrition Targets - Frontend Utility
 *
 * Fetches user's personalized nutrition targets from their active plan.
 * Used by UI components to display dynamic target values instead of hard-coded fallbacks.
 *
 * IMPORTANT: This uses the EXACT SAME source as the nutrition screen to ensure consistency:
 * 1. First: localStorage customNutritionTargets (user-edited values)
 * 2. Then: profiles.nutrition_plan.dailyTargets (from DB)
 * 3. Fallback: hardcoded defaults
 */

import { supabase } from '@/lib/supabase';
import * as storage from '@/lib/storage';

export interface UserNutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  tdee: number;
}

/**
 * Fetch user's personalized nutrition targets from their active nutrition plan
 * Uses SAME source as nutrition screen for consistency
 *
 * @returns User's targets or null if not found
 */
export async function getUserNutritionTargets(): Promise<UserNutritionTargets | null> {
  try {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[UserTargets] No authenticated user');
      return null;
    }

    const userId = user.id;

    // 1. FIRST PRIORITY: Check localStorage for custom targets (same as nutrition screen)
    const customTargets = storage.getJson<{
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    }>(userId, 'customNutritionTargets');

    // 2. SECOND PRIORITY: Fetch from profiles.nutrition_plan (same as nutrition screen)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('nutrition_plan')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.warn('[UserTargets] No profile found', profileError);
      return null;
    }

    // Extract nutrition plan (same structure as /api/nutrition/plan)
    const plan = profile.nutrition_plan as any;
    const planTargets = plan?.dailyTargets;

    if (!planTargets) {
      console.warn('[UserTargets] No dailyTargets found in nutrition plan');
      return null;
    }

    // Use EXACT SAME priority as nutrition screen (line 754-757 of nutrition/page.tsx):
    // customTargets.X ?? plan?.dailyTargets?.X ?? default
    // Note: tdee comes from plan if not in profile
    const result = {
      calories: customTargets?.calories ?? planTargets?.calories ?? 0,
      protein: customTargets?.protein ?? planTargets?.protein_g ?? 0,
      carbs: customTargets?.carbs ?? planTargets?.carbs_g ?? 0,
      fat: customTargets?.fat ?? planTargets?.fat_g ?? 0,
      tdee: planTargets?.tdee || planTargets?.calories || 0,
    };

    // DEBUG: Log resolved targets
    console.log('[UserTargets] Resolved nutrition targets', {
      customTargets,
      planTargetsProtein: planTargets?.protein_g,
      result,
    });

    return result;
  } catch (err) {
    console.error('[UserTargets] Error fetching user nutrition targets:', err);
    return null;
  }
}

/**
 * Resolve dynamic target value based on condition type and user's plan
 *
 * @param conditionType - The task condition type (e.g., 'HIT_PROTEIN_GOAL')
 * @param useUserTarget - Whether to use user's personalized target
 * @param fallbackTarget - Fallback value if user target not found
 * @param userTargets - Pre-fetched user targets (optional, will fetch if not provided)
 * @returns Resolved target value
 */
export async function resolveTargetValue(
  conditionType: string,
  useUserTarget: boolean,
  fallbackTarget: number,
  userTargets?: UserNutritionTargets | null
): Promise<number> {
  // If not using user target, return fallback
  if (!useUserTarget) {
    return fallbackTarget;
  }

  // Fetch targets if not provided
  const targets = userTargets ?? await getUserNutritionTargets();
  if (!targets) {
    console.warn('[UserTargets] Could not fetch user targets, using fallback');
    return fallbackTarget;
  }

  // Resolve based on condition type
  switch (conditionType) {
    case 'HIT_PROTEIN_GOAL':
      return targets.protein;

    case 'WEEKLY_DEFICIT':
      // Target deficit = TDEE - calories
      return targets.tdee - targets.calories;

    case 'WEEKLY_SURPLUS':
      // Target surplus = calories - TDEE
      return targets.calories - targets.tdee;

    case 'WEEKLY_BALANCED':
      // For recomp/maintenance, target is the plan's calories
      return targets.calories;

    default:
      console.warn(`[UserTargets] Unknown condition type: ${conditionType}`);
      return fallbackTarget;
  }
}
