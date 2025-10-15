/**
 * Onboarding Steps Configuration
 * Defines the exact order and navigation for all onboarding screens
 */

export type OnboardingStepId =
  | "gender"
  | "goals"
  | "frequency"
  | "experience"
  | "motivation"
  | "longterm"
  | "metrics"
  | "birthdate"
  | "target-weight"
  | "goal-summary"
  | "pace"
  | "activity"
  | "diet"
  | "readiness"
  | "reminders";

export const ONBOARDING_STEPS: OnboardingStepId[] = [
  "gender",
  "goals",
  "frequency",
  "experience",
  "motivation",
  "longterm",
  "metrics",
  "birthdate",
  "target-weight",
  "goal-summary",
  "pace",
  "activity",
  "diet",
  "readiness",
  "reminders",
];

export const STEP_INDEX: Record<OnboardingStepId, number> = {
  gender: 0,
  goals: 1,
  frequency: 2,
  experience: 3,
  motivation: 4,
  longterm: 5,
  metrics: 6,
  birthdate: 7,
  "target-weight": 8,
  "goal-summary": 9,
  pace: 10,
  activity: 11,
  diet: 12,
  readiness: 13,
  reminders: 14,
};

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

/**
 * Get the URL path for a given step
 */
export function getStepPath(id: OnboardingStepId): string {
  return `/onboarding/${id}`;
}

/**
 * Get the next step in the onboarding flow
 */
export function getNextStep(id: OnboardingStepId): OnboardingStepId | null {
  const currentIndex = STEP_INDEX[id];
  const nextIndex = currentIndex + 1;
  return nextIndex < TOTAL_STEPS ? ONBOARDING_STEPS[nextIndex] : null;
}

/**
 * Get the previous step in the onboarding flow
 */
export function getPrevStep(id: OnboardingStepId): OnboardingStepId | null {
  const currentIndex = STEP_INDEX[id];
  const prevIndex = currentIndex - 1;
  return prevIndex >= 0 ? ONBOARDING_STEPS[prevIndex] : null;
}
