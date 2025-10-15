/**
 * Utility for storing and retrieving onboarding data
 * Uses localStorage for guest users before they sign up
 */

const ONBOARDING_DATA_KEY = 'gymbro_onboarding_data';

export interface OnboardingData {
  gender?: string;
  goals?: string[];
  frequency?: number;
  experience?: string;
  motivation?: string;
  height_cm?: number;
  weight_kg?: number;
  bmi?: number;
  birthdate?: string;
  target_weight_kg?: number;
  pace?: string;
  activity?: string;
  diet?: string;
  notifications_opt_in?: boolean;
  onboarding_progress?: {
    lastCompletedIndex: number;
  };
}

export const saveOnboardingData = (data: Partial<OnboardingData>) => {
  const existing = getOnboardingData();
  const updated = { ...existing, ...data };
  localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(updated));
};

export const getOnboardingData = (): OnboardingData => {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(ONBOARDING_DATA_KEY);
  return stored ? JSON.parse(stored) : {};
};

export const clearOnboardingData = () => {
  localStorage.removeItem(ONBOARDING_DATA_KEY);
};

export const getOnboardingProgress = () => {
  const data = getOnboardingData();
  return data.onboarding_progress || { lastCompletedIndex: -1 };
};

export const saveOnboardingProgress = (lastCompletedIndex: number) => {
  saveOnboardingData({
    onboarding_progress: { lastCompletedIndex }
  });
};
