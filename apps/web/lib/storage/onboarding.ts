/**
 * Onboarding storage wrapper
 * Re-exports onboarding storage functions from the main onboarding-storage module
 *
 * This wrapper provides a unified storage API under lib/storage/
 */

import {
  clearOnboardingData as originalClearOnboardingData,
  type OnboardingData as OriginalOnboardingData,
  getOnboardingData as originalGetOnboardingData,
  saveOnboardingData as originalSaveOnboardingData,
  getOnboardingProgress as originalGetOnboardingProgress,
  saveOnboardingProgress as originalSaveOnboardingProgress,
  getNumericFrequency as originalGetNumericFrequency,
} from '../onboarding-storage';

export type OnboardingData = OriginalOnboardingData;

/**
 * Clear onboarding data from localStorage
 * Safe to call on both client and server (no-op on server)
 */
export function clearOnboardingData(): void {
  // Safety check for server-side rendering
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.log('[storage/onboarding] Skipping clearOnboardingData on server');
    return;
  }

  try {
    originalClearOnboardingData();
  } catch (err) {
    console.error('[storage/onboarding] Failed to clear onboarding data:', err);
  }
}

// Re-export other functions as-is
export const getOnboardingData = originalGetOnboardingData;
export const saveOnboardingData = originalSaveOnboardingData;
export const getOnboardingProgress = originalGetOnboardingProgress;
export const saveOnboardingProgress = originalSaveOnboardingProgress;
export const getNumericFrequency = originalGetNumericFrequency;
