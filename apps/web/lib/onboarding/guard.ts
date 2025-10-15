/**
 * Server-side onboarding guards and redirects
 * Ensures users can only access appropriate steps
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { OnboardingStepId, STEP_INDEX, TOTAL_STEPS, getStepPath, ONBOARDING_STEPS } from "./steps";
import { getProgress } from "./store";

/**
 * Guard function to redirect users to the correct step
 * Call this at the top of each onboarding page
 */
export async function redirectToCurrentStepOrAllow(
  supabase: SupabaseClient,
  current: OnboardingStepId
): Promise<void> {
  // Check if user is signed in
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Get progress
  const { lastCompletedIndex } = await getProgress(supabase);
  const currentStepIndex = STEP_INDEX[current];

  // If trying to skip ahead (more than 1 step)
  if (currentStepIndex > lastCompletedIndex + 1) {
    const nextAllowedIndex = lastCompletedIndex + 1;
    const nextStep = ONBOARDING_STEPS[nextAllowedIndex];
    redirect(getStepPath(nextStep));
  }

  // Allow access - user is on correct step or revisiting completed step
}

/**
 * Get the next allowed step for a user
 */
export async function getNextAllowedStep(
  supabase: SupabaseClient
): Promise<OnboardingStepId | null> {
  const { lastCompletedIndex } = await getProgress(supabase);

  // If completed all steps
  if (lastCompletedIndex >= TOTAL_STEPS - 1) {
    return null;
  }

  // Next step is the one after last completed
  const nextIndex = lastCompletedIndex + 1;
  return ONBOARDING_STEPS[nextIndex];
}
