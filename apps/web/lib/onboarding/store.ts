/**
 * Onboarding Progress Persistence
 * Handles saving step data and tracking progress in Supabase
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { OnboardingStepId, STEP_INDEX, TOTAL_STEPS } from "./steps";

export interface OnboardingProgress {
  lastCompletedIndex: number;
  metadata: Record<string, any>;
}

/**
 * Save a step's data and update progress
 * Stores in both user metadata and profiles table
 */
export async function saveStep(
  supabase: SupabaseClient,
  stepId: OnboardingStepId,
  payload: Record<string, any>
): Promise<{ lastCompletedIndex: number }> {
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Get existing onboarding metadata
  const existingMetadata = user.user_metadata?.onboarding || {};
  const existingProgress = user.user_metadata?.onboarding_progress || {
    lastCompletedIndex: -1,
  };

  // Calculate new progress
  const currentStepIndex = STEP_INDEX[stepId];
  const newLastCompletedIndex = Math.max(
    existingProgress.lastCompletedIndex,
    currentStepIndex
  );

  // Update user metadata
  const newMetadata = {
    ...existingMetadata,
    [stepId]: payload,
  };

  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      onboarding: newMetadata,
      onboarding_progress: {
        lastCompletedIndex: newLastCompletedIndex,
      },
      ...payload, // Also store top-level for backwards compatibility
    },
  });

  if (metaError) {
    throw metaError;
  }

  // Upsert profiles table
  try {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        onboarding_last_completed: newLastCompletedIndex,
        updated_at: new Date().toISOString(),
        ...payload, // Store step data in profiles
      },
      {
        onConflict: "id",
      }
    );

    if (profileError) {
      console.warn("Failed to update profile:", profileError);
      // Don't throw - metadata is primary source
    }
  } catch (err) {
    console.warn("Profile update error:", err);
  }

  return { lastCompletedIndex: newLastCompletedIndex };
}

/**
 * Get current onboarding progress
 */
export async function getProgress(
  supabase: SupabaseClient
): Promise<OnboardingProgress> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      lastCompletedIndex: -1,
      metadata: {},
    };
  }

  const progress = user.user_metadata?.onboarding_progress || {
    lastCompletedIndex: -1,
  };
  const metadata = user.user_metadata?.onboarding || {};

  return {
    lastCompletedIndex: progress.lastCompletedIndex,
    metadata,
  };
}

/**
 * Mark onboarding as fully complete
 */
export async function completeOnboarding(
  supabase: SupabaseClient
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  await supabase.auth.updateUser({
    data: {
      onboarding_progress: {
        lastCompletedIndex: TOTAL_STEPS - 1,
        completed: true,
        completedAt: new Date().toISOString(),
      },
    },
  });

  // Update profiles
  try {
    await supabase
      .from("profiles")
      .update({
        onboarding_last_completed: TOTAL_STEPS - 1,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  } catch (err) {
    console.warn("Profile completion update error:", err);
  }
}
