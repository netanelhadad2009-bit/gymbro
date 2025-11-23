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
  accept_marketing?: boolean;
  notifications_opt_in?: boolean;
  onboarding_progress?: {
    lastCompletedIndex: number;
  };
  updatedAt?: number; // Timestamp for recency tracking
  source?: string;    // Source of the data (e.g., "onboarding", "profile")
}

export const saveOnboardingData = (data: Partial<OnboardingData>) => {
  try {
    const existing = getOnboardingData() || {};
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

/**
 * Normalize onboarding data to ensure it has the expected flat structure
 * Handles nested structures that might exist from different onboarding flows
 */
export const normalizeOnboardingStorage = (data: any): OnboardingData | null => {
  if (!data) return null;

  // If data is already flat with expected fields, return it
  if (data.gender || data.goals || data.height_cm || data.weight_kg) {
    console.log('[OnboardingStorage] Data is already in flat format');
    return data;
  }

  // Check for nested structures (e.g., data.profile, data.answers, data.state)
  let normalized: OnboardingData = {};

  // Try to extract from common nested patterns
  const possibleSources = [
    data,                      // Already flat
    data.profile,             // Nested under profile
    data.answers,             // Nested under answers
    data.state?.profile,      // Nested under state.profile
    data.data,               // Nested under data
  ];

  for (const source of possibleSources) {
    if (source && typeof source === 'object') {
      // Extract all relevant fields
      if (source.gender !== undefined) normalized.gender = source.gender;
      if (source.goals !== undefined) normalized.goals = source.goals;
      if (source.height_cm !== undefined) normalized.height_cm = source.height_cm;
      if (source.weight_kg !== undefined) normalized.weight_kg = source.weight_kg;
      if (source.target_weight_kg !== undefined) normalized.target_weight_kg = source.target_weight_kg;
      if (source.birthdate !== undefined) normalized.birthdate = source.birthdate;
      if (source.diet !== undefined) normalized.diet = source.diet;
      if (source.activity !== undefined) normalized.activity = source.activity;
      if (source.training_frequency_actual !== undefined) normalized.training_frequency_actual = source.training_frequency_actual;
      if (source.frequency !== undefined) normalized.frequency = source.frequency;
      if (source.experience !== undefined) normalized.experience = source.experience;
      if (source.motivation !== undefined) normalized.motivation = source.motivation;
      if (source.accept_marketing !== undefined) normalized.accept_marketing = source.accept_marketing;
      if (source.notifications_opt_in !== undefined) normalized.notifications_opt_in = source.notifications_opt_in;
      if (source.bmi !== undefined) normalized.bmi = source.bmi;
      if (source.pace !== undefined) normalized.pace = source.pace;
      if (source.onboarding_progress !== undefined) normalized.onboarding_progress = source.onboarding_progress;
      if (source.updatedAt !== undefined) normalized.updatedAt = source.updatedAt;
      if (source.source !== undefined) normalized.source = source.source;
    }
  }

  // Check if we found any meaningful data
  const hasData = !!(
    normalized.gender ||
    normalized.goals?.length ||
    normalized.height_cm ||
    normalized.weight_kg ||
    normalized.diet ||
    normalized.activity
  );

  if (!hasData) {
    console.log('[OnboardingStorage] No meaningful data found after normalization');
    return null;
  }

  console.log('[OnboardingStorage] Normalized data:', {
    hasGender: !!normalized.gender,
    hasGoals: !!(normalized.goals && normalized.goals.length > 0),
    hasHeight: !!normalized.height_cm,
    hasWeight: !!normalized.weight_kg,
    hasBirthdate: !!normalized.birthdate,
    hasDiet: !!normalized.diet,
    hasActivity: !!normalized.activity,
  });

  return normalized;
};

// New function that returns null when no data (for new code)
export const getOnboardingDataOrNull = (): OnboardingData | null => {
  if (typeof window === 'undefined') return null;

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

    if (!stored) {
      console.log('[OnboardingStorage] No onboarding data found in localStorage');
      return null;
    }

    const parsed = JSON.parse(stored);
    console.log('[OnboardingStorage] Raw stored onboarding data:', parsed);

    // Validate parsed data is an object
    if (typeof parsed !== 'object' || parsed === null) {
      console.error('[OnboardingStorage] Invalid data type, clearing storage');
      localStorage.removeItem(ONBOARDING_DATA_KEY);
      return null;
    }

    // Normalize the data structure
    const normalized = normalizeOnboardingStorage(parsed);
    console.log('[OnboardingStorage] Normalized onboarding data:', normalized);

    return normalized;
  } catch (error) {
    console.error('[OnboardingStorage] Failed to parse onboarding data:', error);
    // Clear corrupted data
    try {
      localStorage.removeItem(ONBOARDING_DATA_KEY);
      localStorage.removeItem(LEGACY_KEY);
    } catch (clearError) {
      console.error('[OnboardingStorage] Failed to clear corrupted data:', clearError);
    }
    return null;
  }
};

// Backward compatible version that returns empty object (for existing code)
export const getOnboardingData = (): OnboardingData => {
  const data = getOnboardingDataOrNull();
  return data || {};
};

export const clearOnboardingData = () => {
  localStorage.removeItem(ONBOARDING_DATA_KEY);
  localStorage.removeItem(LEGACY_KEY); // Also clear legacy key if exists
};

export const getOnboardingProgress = () => {
  const data = getOnboardingData();
  return data?.onboarding_progress || { lastCompletedIndex: -1 };
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
export const getNumericFrequency = (data: OnboardingData | null): number => {
  if (!data) return 3; // Default if no data

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
