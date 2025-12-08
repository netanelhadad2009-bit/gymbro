import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = 'onboarding_data';

export interface OnboardingData {
  gender?: 'male' | 'female' | 'other';
  goals?: string[];
  training_frequency_actual?: 'low' | 'medium' | 'high';
  experience?: string;
  motivation?: string;
  longterm?: string;
  height_cm?: number;
  weight_kg?: number;
  birthdate?: string;
  target_weight_kg?: number;
  weekly_pace_kg?: number;
  activity?: 'sedentary' | 'light' | 'high';
  diet?: string;
  readiness?: number;
  notifications_opt_in?: boolean;
  updatedAt?: number;
}

export async function getOnboardingData(): Promise<OnboardingData> {
  try {
    const data = await AsyncStorage.getItem(ONBOARDING_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[OnboardingStorage] Error reading data:', error);
    return {};
  }
}

export async function saveOnboardingData(newData: Partial<OnboardingData>): Promise<void> {
  try {
    const existing = await getOnboardingData();
    const updated = {
      ...existing,
      ...newData,
      updatedAt: Date.now(),
    };
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(updated));
    console.log('[OnboardingStorage] Saved:', Object.keys(newData).join(', '));
  } catch (error) {
    console.error('[OnboardingStorage] Error saving data:', error);
  }
}

export async function clearOnboardingData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    console.log('[OnboardingStorage] Cleared');
  } catch (error) {
    console.error('[OnboardingStorage] Error clearing data:', error);
  }
}

// Step order for navigation
export const ONBOARDING_STEPS = [
  'gender',
  'goals',
  'training-frequency',
  'experience',
  'motivation',
  'longterm',
  'metrics',
  'birthdate',
  'target-weight',
  'goal-summary',
  'pace',
  'activity',
  'diet',
  'readiness',
  'rating',
  'reminders',
  'generating',
] as const;

export type OnboardingStepId = typeof ONBOARDING_STEPS[number];

export function getNextStep(currentStep: OnboardingStepId): OnboardingStepId | null {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= ONBOARDING_STEPS.length - 1) {
    return null;
  }
  return ONBOARDING_STEPS[currentIndex + 1];
}

export function getPrevStep(currentStep: OnboardingStepId): OnboardingStepId | null {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return ONBOARDING_STEPS[currentIndex - 1];
}

export function getStepProgress(currentStep: OnboardingStepId): number {
  const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);
  if (currentIndex === -1) return 0;
  return ((currentIndex + 1) / ONBOARDING_STEPS.length) * 100;
}
