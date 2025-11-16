/**
 * Utility for storing and retrieving onboarding data
 * Uses localStorage for guest users before they sign up
 */

const ONBOARDING_DATA_KEY = 'fitjourney_onboarding_data';
const LEGACY_KEY = 'gymbro_onboarding_data'; // Keep for migration

export interface OnboardingData {
  gender?: string;
  goals?: string[];
  frequency?: number; // Legacy field - kept for backward compatibility
  training_frequency_actual?: "low" | "medium" | "high"; // Current training frequency
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
  updatedAt?: number; // Timestamp for recency tracking
  source?: string;    // Source of the data (e.g., "onboarding", "profile")
}

export const saveOnboardingData = (data: Partial<OnboardingData>) => {
  try {
    const existing = getOnboardingData();
    const updated = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
      source: data.source || "onboarding"
    };

    const serialized = JSON.stringify(updated);
    localStorage.setItem(ONBOARDING_DATA_KEY, serialized);
  } catch (error) {
    console.error('[OnboardingStorage] Failed to save onboarding data:', error);

    // Check if it's a quota exceeded error
    const isQuotaError =
      (error instanceof DOMException && error.name === 'QuotaExceededError') ||
      (error as any)?.name === 'QuotaExceededError';

    if (isQuotaError) {
      console.error('[OnboardingStorage] LocalStorage quota exceeded');
      // Try to clear old data and retry once
      try {
        localStorage.removeItem(ONBOARDING_DATA_KEY);
        const updated = {
          ...data,
          updatedAt: Date.now(),
          source: data.source || "onboarding"
        };
        localStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(updated));
        console.log('[OnboardingStorage] Retry after clear succeeded');
      } catch (retryError) {
        console.error('[OnboardingStorage] Retry failed:', retryError);
      }
    }
  }
};

export const getOnboardingData = (): OnboardingData => {
  if (typeof window === 'undefined') return {};

  try {
    // Try new key first
    let stored = localStorage.getItem(ONBOARDING_DATA_KEY);

    // If not found, try legacy key and migrate
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        // Migrate from legacy key
        localStorage.setItem(ONBOARDING_DATA_KEY, legacy);
        localStorage.removeItem(LEGACY_KEY);
        console.log('[OnboardingStorage] Migrated data from legacy key');
        stored = legacy;
      }
    }

    if (!stored) return {};

    const parsed = JSON.parse(stored);

    // Validate parsed data is an object
    if (typeof parsed !== 'object' || parsed === null) {
      console.error('[OnboardingStorage] Invalid data type, clearing storage');
      localStorage.removeItem(ONBOARDING_DATA_KEY);
      return {};
    }

    return parsed as OnboardingData;
  } catch (error) {
    console.error('[OnboardingStorage] Failed to parse onboarding data:', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(ONBOARDING_DATA_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch (clearError) {
      console.error('[OnboardingStorage] Failed to clear corrupted data:', clearError);
    }
    return {};
  }
};

export const clearOnboardingData = () => {
  localStorage.removeItem(ONBOARDING_DATA_KEY);
  localStorage.removeItem(LEGACY_KEY); // Also clear legacy key if exists
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

/**
 * Maps the new training_frequency_actual values to numeric frequency
 * for backward compatibility with existing API endpoints
 */
export const getNumericFrequency = (data: OnboardingData): number => {
  // If we have the new training_frequency_actual, use it
  if (data.training_frequency_actual) {
    switch (data.training_frequency_actual) {
      case "low":
        return 2;
      case "medium":
        return 4;
      case "high":
        return 6;
      default:
        return 3;
    }
  }
  // Fall back to legacy frequency field
  return data.frequency || 3;
};
