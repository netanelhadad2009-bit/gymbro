/**
 * Migration utility to ensure returning users have their birthdate saved in user metadata
 * This handles the case where users signed up before we started saving birthdate to metadata
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getOnboardingData } from '@/lib/onboarding-storage';

/**
 * Check and migrate birthdate from localStorage to user metadata if needed
 * This is called for returning users to ensure they have birthdate saved
 */
export async function migrateBirthdateToMetadata(supabase: SupabaseClient): Promise<boolean> {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log('[MigrateBirthdate] No user found');
      return false;
    }

    const metadata = user.user_metadata || {};

    // Check if user already has birthdate in metadata
    if (metadata.birthdate) {
      console.log('[MigrateBirthdate] User already has birthdate in metadata');
      return true;
    }

    // Try to get birthdate from localStorage (onboarding data)
    let localData = null;
    try {
      localData = getOnboardingData();
    } catch (err) {
      console.warn('[MigrateBirthdate] Failed to get localStorage data:', err);
    }

    if (!localData?.birthdate) {
      console.log('[MigrateBirthdate] No birthdate found in localStorage');
      return false;
    }

    console.log('[MigrateBirthdate] Found birthdate in localStorage, migrating to metadata...');

    // Calculate age from birthdate for completeness
    let age: number | null = null;
    try {
      const birthDate = new Date(localData.birthdate);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 13 || age > 120) age = null; // Validate age
    } catch {
      // If we can't calculate age, that's okay - birthdate is more important
    }

    // Update user metadata with birthdate (and age if calculated)
    const updates: any = {
      birthdate: localData.birthdate,
      ...metadata, // Preserve existing metadata
    };

    if (age && !metadata.age) {
      updates.age = age;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: updates
    });

    if (updateError) {
      console.error('[MigrateBirthdate] Error updating user metadata:', updateError);
      return false;
    }

    console.log('[MigrateBirthdate] ✅ Successfully migrated birthdate to metadata');
    return true;

  } catch (err) {
    console.error('[MigrateBirthdate] Unexpected error:', err);
    return false;
  }
}

/**
 * Ensure user has birthdate in either metadata or localStorage
 * Returns the birthdate if found, null otherwise
 */
export async function ensureUserHasBirthdate(supabase: SupabaseClient): Promise<string | null> {
  try {
    // First, try to migrate if needed
    await migrateBirthdateToMetadata(supabase);

    // Get current user with updated metadata
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!error && user?.user_metadata?.birthdate) {
      return user.user_metadata.birthdate;
    }

    // Fallback to localStorage
    try {
      const localData = getOnboardingData();
      if (localData?.birthdate) {
        return localData.birthdate;
      }
    } catch {
      // localStorage not available or data not found
    }

    return null;
  } catch (err) {
    console.error('[EnsureBirthdate] Error:', err);
    return null;
  }
}