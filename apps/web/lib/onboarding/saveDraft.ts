'use client';

import { saveOnboardingData } from '@/lib/onboarding-storage';

/**
 * Save onboarding data in the background (fire-and-forget)
 * This function returns immediately and doesn't block navigation
 */
export async function saveOnboardingDraft(patch: Record<string, unknown>): Promise<void> {
  try {
    // Save to localStorage synchronously (fast operation)
    saveOnboardingData(patch);

    // Future: Add Supabase sync here if user is authenticated
    // const supabase = createClientComponentClient();
    // const { data: { user } } = await supabase.auth.getUser();
    // if (user) {
    //   await supabase
    //     .from('profiles')
    //     .update({ onboarding_data: patch, updated_at: new Date().toISOString() })
    //     .eq('id', user.id);
    // }
  } catch (error) {
    // Log error but don't throw - we don't want to block navigation
    console.error('[saveOnboardingDraft] Failed to save:', error);
    throw error; // Allow caller to handle retry
  }
}
