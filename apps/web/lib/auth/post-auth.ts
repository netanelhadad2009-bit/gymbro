/**
 * ⚠️ IMPORTANT: This module is used from CLIENT COMPONENTS
 *
 * This file is imported by:
 * - apps/web/components/SocialAuthButtons.tsx (client component)
 * - apps/web/app/signup/SignupClient.tsx (client component)
 *
 * Therefore, it MUST NOT import or depend on:
 * - next/headers (server-only)
 * - @supabase/ssr createServerClient (server-only)
 * - Any file that imports the above (e.g., lib/supabase-server.ts, lib/profile/getProfile.ts)
 *
 * Instead, use the SupabaseClient passed as a parameter to runPostAuthFlow.
 */

import { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { clearOnboardingData } from '@/lib/storage/onboarding';
import { clearProgramDraft, getPlanSession, clearPlanSession } from '@/lib/storage/program';
import { hasCompleteProfile, type UserProfile } from '@/lib/profile/types';

/**
 * Unified post-authentication flow
 * Runs after successful authentication (email signup, Google OAuth, Apple OAuth)
 * Handles profile setup, avatar creation, plan attachment, journey bootstrapping, and navigation
 */

interface PostAuthFlowParams {
  user: User;
  session: Session;
  provider: 'email' | 'google' | 'apple';
  storage: any; // localStorage wrapper
  supabase: SupabaseClient;
  onboardingDataOverride?: any | null; // Optional onboarding data to use instead of reading from storage
}

/**
 * Normalize persona values to canonical form
 * Maps various input formats to standard persona codes
 */
function normalizePersona(persona: string | undefined): string | null {
  if (!persona) return null;

  const lower = persona.toLowerCase().trim();

  // Map variations to canonical values
  const personaMap: Record<string, string> = {
    // Hebrew variations
    'כושר כללי': 'general_fitness',
    'כושר': 'general_fitness',
    'general fitness': 'general_fitness',
    'general': 'general_fitness',

    'בניית שריר': 'muscle_building',
    'שריר': 'muscle_building',
    'muscle': 'muscle_building',
    'muscle building': 'muscle_building',
    'muscle_building': 'muscle_building',

    'שיפור כוח': 'strength_building',
    'כוח': 'strength_building',
    'strength': 'strength_building',
    'strength building': 'strength_building',
    'strength_building': 'strength_building',

    'ירידה במשקל': 'weight_loss',
    'ירידה': 'weight_loss',
    'weight loss': 'weight_loss',
    'weight_loss': 'weight_loss',
    'lose weight': 'weight_loss',
  };

  return personaMap[lower] || persona;
}

/**
 * Normalize gender value to canonical form
 * Mirrors normalization logic from lib/profile/getProfile.ts
 */
function normalizeGender(gender: string | null | undefined): 'male' | 'female' | 'other' | null {
  if (!gender) return null;
  const genderRaw = gender.toString().toLowerCase();
  if (genderRaw.includes('זכר') || genderRaw === 'male' || genderRaw === 'm') {
    return 'male';
  } else if (genderRaw.includes('נקבה') || genderRaw === 'female' || genderRaw === 'f') {
    return 'female';
  } else if (genderRaw.includes('אחר') || genderRaw === 'other') {
    return 'other';
  }
  return null;
}

/**
 * Normalize goal value to canonical form
 * Maps various input formats to standard goal codes that match DB constraint
 */
function normalizeGoal(goal: string | null | undefined): 'gain' | 'loss' | 'maintain' | null {
  if (!goal) return null;
  const goalRaw = goal.toString().toLowerCase();

  // Handle various goal formats
  if (goalRaw.includes('gain') || goalRaw.includes('עלי') || goalRaw.includes('בניית') ||
      goalRaw === 'bulk' || goalRaw === 'muscle') {
    return 'gain';
  } else if (goalRaw.includes('loss') || goalRaw.includes('ירידה') || goalRaw.includes('הרזיה') ||
             goalRaw === 'cut' || goalRaw === 'diet') {
    return 'loss';
  } else if (goalRaw.includes('maintain') || goalRaw.includes('שמירה') || goalRaw.includes('שמור') ||
             goalRaw === 'recomp' || goalRaw === 'recomposition' || goalRaw === 'tone' || goalRaw === 'body_recomp') {
    // Map recomposition to maintain (due to DB constraint - profiles.goal only accepts 'gain', 'loss', 'maintain')
    // Programs table supports 'recomp' separately, but profiles doesn't
    return 'maintain';
  }

  // Default to maintain if we can't determine
  console.log(`[PostAuth] Unknown goal "${goal}", defaulting to "maintain"`);
  return 'maintain';
}

/**
 * Normalize activity level to match DB constraint
 * Maps various input formats to standard activity level codes
 */
function normalizeActivityLevel(
  level: string | null | undefined
): 'low' | 'medium' | 'high' | null {
  if (!level) return null;
  const raw = level.toString().toLowerCase().trim();

  // Map various activity level formats to DB-safe values
  if (
    raw === 'low' ||
    raw === 'sedentary' ||
    raw.includes('light') ||
    raw.includes('נמוכ') // Hebrew: "נמוכה" (low/light)
  ) {
    return 'low';
  }

  if (
    raw === 'medium' ||
    raw.includes('moderate') ||
    raw.includes('בינונ') // Hebrew: "בינונית" (medium/moderate)
  ) {
    return 'medium';
  }

  if (
    raw === 'high' ||
    raw === 'active' ||
    raw.includes('intense') ||
    raw.includes('גבוה') // Hebrew: "גבוהה" (high)
  ) {
    return 'high';
  }

  console.log('[PostAuth] Unknown activity_level "%s", defaulting to null', level);
  return null;
}

/**
 * Normalize diet to match DB constraint
 * Maps various input formats to standard diet codes
 */
function normalizeDiet(
  diet: string | null | undefined
): 'regular' | 'vegan' | 'vegetarian' | 'keto' | 'paleo' | null {
  if (!diet) return null;
  const raw = diet.toString().toLowerCase().trim();

  // Map "none" and empty values to "regular"
  if (raw === 'none' || raw === '' || raw === 'regular') {
    return 'regular';
  }

  // Valid diet values
  if (raw === 'vegan' || raw.includes('vegan')) {
    return 'vegan';
  }

  if (raw === 'vegetarian' || raw.includes('vegetarian')) {
    return 'vegetarian';
  }

  if (raw === 'keto') {
    return 'keto';
  }

  if (raw === 'paleo') {
    return 'paleo';
  }

  // Default to regular for unknown values
  console.log('[PostAuth] Unknown diet "%s", defaulting to "regular"', diet);
  return 'regular';
}

/**
 * Check if avatar exists for user
 * Avatar creation is handled by /api/avatar/bootstrap (Step 2)
 * This just verifies the avatar was created successfully
 */
async function ensureAvatar(
  supabase: SupabaseClient,
  userId: string
): Promise<{ user_id: string } | null> {
  console.log('[PostAuth] Checking if avatar exists for user:', userId);

  try {
    // Check if avatar already exists in unified avatars table
    const { data: existingAvatar, error: fetchError } = await supabase
      .from('avatars')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle to handle 0 or 1 results gracefully

    if (fetchError) {
      console.error('[PostAuth] Error fetching existing avatar:', fetchError);
      throw fetchError;
    }

    if (existingAvatar) {
      console.log('[PostAuth] ✅ Avatar already exists for user');
      return existingAvatar;
    }

    console.log('[PostAuth] No avatar found - will be created by bootstrap API');
    // Avatar creation is handled by /api/avatar/bootstrap in Step 2
    // If it doesn't exist here, it means bootstrap failed or hasn't run yet
    return null;
  } catch (err) {
    console.error('[PostAuth] ❌ Failed to check avatar:', err);
    // Don't throw - avatar check is not critical for auth flow
    return null;
  }
}

/**
 * Ensure profile row exists for user
 * Creates a profile row with safe defaults if it doesn't exist
 *
 * @param supabase Supabase client
 * @param userId User ID
 * @param opts Optional data from onboarding (goal, etc.)
 * @returns Profile row (existing or newly created)
 */
async function ensureProfileExists(
  supabase: SupabaseClient,
  userId: string,
  opts?: { goal?: string | null }
): Promise<any | null> {
  console.log('[PostAuth] Ensuring profile exists for user:', userId);

  try {
    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[PostAuth] Error fetching existing profile:', fetchError);
      // Log but don't throw - profile check failure is not fatal
      return null;
    }

    if (existingProfile) {
      console.log('[PostAuth] ✅ Profile already exists');

      // If profile exists but doesn't have a goal and we have one from onboarding, update it
      if (!existingProfile.goal && opts?.goal) {
        console.log('[PostAuth] Updating profile with goal from onboarding:', opts.goal);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ goal: opts.goal, updated_at: new Date().toISOString() })
          .eq('id', userId);

        if (updateError) {
          console.error('[PostAuth] Failed to update profile goal:', updateError);
        } else {
          console.log('[PostAuth] ✅ Profile goal updated');
        }
      }

      return existingProfile;
    }

    console.log('[PostAuth] No profile found, creating with safe defaults...');

    // Create profile with safe defaults using ONLY real DB columns
    const now = new Date().toISOString();
    const newProfile = {
      id: userId,
      age: null,
      gender: null,
      height_cm: null,
      weight_kg: null,
      target_weight_kg: null,
      goal: opts?.goal || null,
      diet: null,
      activity_level: null,
      workout_days_per_week: null,
      injuries: null,
      created_at: now,
      updated_at: now,
    };

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (createError) {
      console.error('[PostAuth] Error creating profile:', createError);
      // Log but don't throw - profile creation failure is not fatal
      return null;
    }

    console.log('[PostAuth] ✅ Profile created successfully');
    return createdProfile;
  } catch (err) {
    console.error('[PostAuth] ❌ Failed to ensure profile:', err);
    // Don't throw - profile creation is not critical for auth flow to complete
    return null;
  }
}

/**
 * Main post-authentication flow
 * Orchestrates all steps after successful authentication
 *
 * Steps:
 * 1. Ensure profile exists and migrate onboarding data
 * 2. Bootstrap avatar AI service
 * 3. Attach pending plan session (if exists)
 * 4. Ensure avatar exists in database
 * 5. Bootstrap journey plan
 * 6. Bootstrap or attach workout stages
 * 7. Check profile completeness and determine navigation route
 * 8. Clean up temporary data
 *
 * @returns Navigation route ("/journey" if profile complete, "/profile/edit" if incomplete)
 * @throws Error if critical steps fail (profile, journey, stages)
 */
export async function runPostAuthFlow({
  user,
  session,
  provider,
  storage,
  supabase,
  onboardingDataOverride,
}: PostAuthFlowParams): Promise<string> {
  console.log('[PostAuth] ========================================');
  console.log('[PostAuth] Starting post-authentication flow');
  console.log('[PostAuth] User:', user.id);
  console.log('[PostAuth] Provider:', provider);
  console.log('[PostAuth] ========================================');

  const userId = user.id;

  try {
    // ============================================================
    // FAST PATH: Check if returning user with complete profile
    // ============================================================
    // For returning users, skip expensive operations if profile is already complete
    console.log('[PostAuth] Checking for fast path (returning user)...');

    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('age, gender, height_cm, weight_kg, goal, journey_bootstrapped, has_completed_onboarding')
      .eq('id', userId)
      .maybeSingle();

    if (!profileCheckError && existingProfile) {
      // Check if profile is complete (with fallback to metadata for age)
      const userMetadata = user.user_metadata || {};
      const effectiveAge = existingProfile.age ?? userMetadata.age ?? null;

      const isProfileComplete = !!(
        effectiveAge &&
        existingProfile.gender &&
        existingProfile.height_cm &&
        existingProfile.weight_kg &&
        existingProfile.goal
      );

      const isJourneyBootstrapped = existingProfile.journey_bootstrapped === true;

      console.log('[PostAuth] Fast path check:', {
        hasProfile: true,
        isComplete: isProfileComplete,
        isJourneyBootstrapped,
        hasCompletedOnboarding: existingProfile.has_completed_onboarding
      });

      // If returning user with complete profile and bootstrapped journey, skip to navigation
      if (isProfileComplete && isJourneyBootstrapped) {
        console.log('[PostAuth] 🚀 Fast path activated - returning user with complete profile');
        console.log('[PostAuth] Skipping redundant steps (profile, avatar, journey already set up)');

        // Still clean up temporary data
        try {
          clearOnboardingData();
          await clearProgramDraft(storage);
          await clearPlanSession(storage);
        } catch (cleanupErr) {
          console.warn('[PostAuth] Cleanup warning (non-critical):', cleanupErr);
        }

        console.log('[PostAuth] ========================================');
        console.log('[PostAuth] ✅ Fast path completed');
        console.log('[PostAuth] Provider:', provider);
        console.log('[PostAuth] Target route: /journey');
        console.log('[PostAuth] ========================================');
        return '/journey';
      } else {
        console.log('[PostAuth] Fast path not available - profile incomplete or journey not bootstrapped');
      }
    } else {
      console.log('[PostAuth] Fast path not available - no existing profile or error:', profileCheckError?.message);
    }

    console.log('[PostAuth] Proceeding with full post-auth flow...');

    // ============================================================
    // STEP 1: Ensure profile exists and migrate onboarding data
    // ============================================================
    console.log('[PostAuth] Step 1/8: Ensuring profile exists and migrating onboarding data...');
    try {
      // Import normalizeOnboardingStorage to ensure data is in expected format
      const { normalizeOnboardingStorage } = await import('../onboarding-storage');

      // Use override if provided, otherwise read from storage
      // Storage key must match the one in lib/onboarding-storage.ts: 'fitjourney_onboarding_data'
      let onboardingData = onboardingDataOverride;

      if (!onboardingData) {
        const onboardingDataStr = await storage.getItem('fitjourney_onboarding_data');
        onboardingData = onboardingDataStr ? JSON.parse(onboardingDataStr) : null;
      }

      // Normalize the data regardless of source
      if (onboardingData) {
        onboardingData = normalizeOnboardingStorage(onboardingData);
      }

      console.log('[PostAuth] Onboarding data source:', onboardingData ?
        (onboardingDataOverride ? 'override' : 'storage') : 'not found');

      if (onboardingData) {
        console.log('[PostAuth] Onboarding data summary:', {
          hasGender: !!onboardingData.gender,
          hasGoals: !!(onboardingData.goals && onboardingData.goals.length > 0),
          hasHeight: !!onboardingData.height_cm,
          hasWeight: !!onboardingData.weight_kg,
          hasBirthdate: !!onboardingData.birthdate,
          birthdate: onboardingData.birthdate, // Log actual birthdate value
          hasDiet: !!onboardingData.diet,
          hasActivity: !!onboardingData.activity,
        });
      }

      // Extract goal from onboarding data and normalize it
      const goalFromOnboarding = onboardingData?.goals?.[0] ?? null;
      const normalizedGoal = normalizeGoal(goalFromOnboarding);

      // Ensure profile row exists (creates with defaults if needed)
      await ensureProfileExists(supabase, userId, { goal: normalizedGoal });

      // If we have full onboarding data, migrate it to profiles table AND auth metadata
      if (onboardingData) {
        console.log('[PostAuth] Migrating full onboarding data to profiles table and auth metadata...');

        const now = new Date().toISOString();

        // Calculate age from birthdate if available, otherwise use existing age from metadata
        let age: number | null = null;
        if (onboardingData.birthdate) {
          const birthDate = new Date(onboardingData.birthdate);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age < 13 || age > 120) age = null; // Validate age
        } else {
          // Fallback: use age from onboarding data or user metadata (preserves existing age)
          const existingAge = onboardingData.age ?? user.user_metadata?.age ?? null;
          age = existingAge;
          console.log('[PostAuth] No birthdate, using fallback age:', {
            onboardingAge: onboardingData.age,
            metadataAge: user.user_metadata?.age,
            finalAge: age
          });
        }

        // Map training frequency to workout days per week
        let workoutDaysPerWeek: number | null = null;
        if (onboardingData.training_frequency_actual) {
          const freqMap: Record<string, number> = {
            'low': 2,
            'medium': 4,
            'high': 6,
          };
          workoutDaysPerWeek = freqMap[onboardingData.training_frequency_actual] ?? null;
        } else if (onboardingData.frequency) {
          workoutDaysPerWeek = onboardingData.frequency;
        }

        // Build profile payload with ONLY real DB columns
        const normalizedActivity = normalizeActivityLevel(onboardingData.activity);
        const normalizedDiet = normalizeDiet(onboardingData.diet);

        const profilePayload = {
          id: userId,
          age: age ?? null,
          birthdate: onboardingData.birthdate ?? null, // IMPORTANT: Save birthdate for accuracy
          gender: normalizeGender(onboardingData.gender),
          height_cm: onboardingData.height_cm ?? null,
          weight_kg: onboardingData.weight_kg ?? null,
          target_weight_kg: onboardingData.target_weight_kg ?? null,
          goal: normalizedGoal,
          diet: normalizedDiet,
          activity_level: normalizedActivity,
          workout_days_per_week: workoutDaysPerWeek,
          injuries: null,
          updated_at: now,
        };

        console.log('[PostAuth] Profile payload:', {
          ...profilePayload,
          id: profilePayload.id.substring(0, 8) + '...',
        });

        // Upsert to profiles table
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' });

        if (upsertError) {
          console.error('[PostAuth] Error upserting profile from onboarding:', upsertError);
          console.error('[PostAuth] Full error details:', JSON.stringify(upsertError, null, 2));
        } else {
          console.log('[PostAuth] ✅ Profile upserted from onboarding data');
        }

        // Update auth user_metadata with complete onboarding data
        const metadata = {
          gender: normalizeGender(onboardingData.gender),
          age: age,
          birthdate: onboardingData.birthdate ?? null, // IMPORTANT: Save birthdate for future age calculations
          height_cm: onboardingData.height_cm ?? null,
          weight_kg: onboardingData.weight_kg ?? null,
          target_weight_kg: onboardingData.target_weight_kg ?? null,
          goals: onboardingData.goals ?? (goalFromOnboarding ? [goalFromOnboarding] : []),
          diet: normalizedDiet,
          activity: normalizedActivity,
          training_frequency_actual: onboardingData.training_frequency_actual ?? null,
          frequency: onboardingData.frequency ?? null,
          experience: onboardingData.experience ?? null,
          motivation: onboardingData.motivation ?? null,
          accept_marketing: onboardingData.accept_marketing ?? false,
          notifications_opt_in: onboardingData.notifications_opt_in ?? true,
          bmi: onboardingData.bmi ?? null,
          pace: onboardingData.pace ?? null,
          source: 'onboarding',
          updatedAt: Date.now(),
        };

        console.log('[PostAuth] Updating auth metadata with onboarding data...');

        const { error: metaError } = await supabase.auth.updateUser({ data: metadata });

        if (metaError) {
          console.error('[PostAuth] Error updating user metadata from onboarding:', metaError);
        } else {
          console.log('[PostAuth] ✅ User metadata updated from onboarding data');
        }
      } else {
        console.log('[PostAuth] No onboarding data found, profile created with defaults');
      }

      console.log('[PostAuth] ✅ Profile ensured and data migrated');
    } catch (err) {
      console.error('[PostAuth] Error ensuring profile:', err);
      // Non-critical, continue
    }

    // ============================================================
    // STEPS 2, 3, 4: Run in PARALLEL for faster execution
    // These are independent operations that don't depend on each other
    // ============================================================
    console.log('[PostAuth] Steps 2-4/8: Running avatar bootstrap, plan session, and avatar verification in PARALLEL...');

    const parallelTasks = await Promise.allSettled([
      // STEP 2: Bootstrap avatar AI service
      (async () => {
        console.log('[PostAuth] [Parallel] Starting avatar bootstrap...');
        try {
          const avatarRes = await fetch('/api/avatar/bootstrap', {
            method: 'POST',
            credentials: 'include',
          });

          if (!avatarRes.ok) {
            const errorText = await avatarRes.text();
            console.error('[PostAuth] Avatar bootstrap failed:', {
              status: avatarRes.status,
              statusText: avatarRes.statusText,
              body: errorText,
            });
            return { step: 2, success: false };
          } else {
            console.log('[PostAuth] ✅ Avatar AI service bootstrapped');
            return { step: 2, success: true };
          }
        } catch (err) {
          console.error('[PostAuth] Error bootstrapping avatar:', err);
          return { step: 2, success: false, error: err };
        }
      })(),

      // STEP 3: Attach pending plan session (if exists)
      (async () => {
        console.log('[PostAuth] [Parallel] Checking for pending plan session...');
        try {
          const planSession = await getPlanSession(storage);

          if (planSession) {
            console.log('[PostAuth] Found pending plan session, attaching...');

            const attachRes = await fetch('/api/session/attach', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ session: planSession }),
            });

            if (!attachRes.ok) {
              const errorText = await attachRes.text();
              console.error('[PostAuth] Plan session attachment failed:', {
                status: attachRes.status,
                statusText: attachRes.statusText,
                body: errorText,
              });
            } else {
              const result = await attachRes.json();
              console.log('[PostAuth] ✅ Plan session attached:', result);
            }

            // Clear plan session regardless of success/failure
            await clearPlanSession(storage);
            console.log('[PostAuth] Plan session cleared from storage');
            return { step: 3, success: true, hadSession: true };
          } else {
            console.log('[PostAuth] No pending plan session found');
            return { step: 3, success: true, hadSession: false };
          }
        } catch (err) {
          console.error('[PostAuth] Error handling plan session:', err);
          return { step: 3, success: false, error: err };
        }
      })(),

      // STEP 4: Ensure avatar exists in database
      (async () => {
        console.log('[PostAuth] [Parallel] Ensuring avatar exists in database...');
        try {
          const avatar = await ensureAvatar(supabase, userId);

          if (avatar) {
            console.log('[PostAuth] ✅ Avatar ready:', avatar);
            return { step: 4, success: true };
          } else {
            console.warn('[PostAuth] ⚠️  Avatar creation skipped or failed');
            return { step: 4, success: false };
          }
        } catch (err) {
          console.error('[PostAuth] Error ensuring avatar:', err);
          return { step: 4, success: false, error: err };
        }
      })(),
    ]);

    // Log parallel task results
    console.log('[PostAuth] ✅ Parallel tasks completed:', parallelTasks.map((r, i) => ({
      step: i + 2,
      status: r.status,
    })));

    // Small delay for DB replication after parallel operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    // ============================================================
    // STEP 5: Bootstrap journey plan
    // ============================================================
    console.log('[PostAuth] Step 5/8: Bootstrapping journey plan...');
    try {
      const bootstrapRes = await fetch('/api/journey/plan/bootstrap', {
        method: 'POST',
        credentials: 'include',
      });

      if (!bootstrapRes.ok) {
        const errorText = await bootstrapRes.text();
        console.error('[PostAuth] Journey bootstrap failed:', {
          status: bootstrapRes.status,
          statusText: bootstrapRes.statusText,
          body: errorText,
        });
        throw new Error(`Journey bootstrap failed: ${bootstrapRes.status}`);
      }

      const bootstrapData = await bootstrapRes.json();
      console.log('[PostAuth] ✅ Journey plan bootstrapped:', bootstrapData);
    } catch (err) {
      console.error('[PostAuth] ❌ Critical: Journey bootstrap failed:', err);
      throw err; // This is critical
    }

    // ============================================================
    // STEP 6: Bootstrap or attach workout stages
    // ============================================================
    console.log('[PostAuth] Step 6/8: Setting up workout stages...');
    try {
      // Check if user has pre-generated stages in storage
      const stagesKey = `stages_${userId}`;
      const cachedStagesStr = await storage.getItem(stagesKey);
      const cachedStages = cachedStagesStr ? JSON.parse(cachedStagesStr) : null;
      const hasPreGeneratedStages = !!(
        cachedStages &&
        Array.isArray(cachedStages) &&
        cachedStages.length > 0
      );

      if (hasPreGeneratedStages) {
        console.log('[PostAuth] Found pre-generated stages, attaching...');

        const attachStagesRes = await fetch('/api/journey/stages/attach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ stages: cachedStages }),
        });

        if (!attachStagesRes.ok) {
          const errorText = await attachStagesRes.text();
          console.error('[PostAuth] Stages attachment failed:', {
            status: attachStagesRes.status,
            statusText: attachStagesRes.statusText,
            body: errorText,
          });
          throw new Error(`Stages attachment failed: ${attachStagesRes.status}`);
        }

        const attachResult = await attachStagesRes.json();
        console.log('[PostAuth] ✅ Pre-generated stages attached:', attachResult);

        // Clear cached stages after successful attachment
        await storage.removeItem(stagesKey);
      } else {
        console.log('[PostAuth] No pre-generated stages, bootstrapping fresh stages...');

        const bootstrapStagesRes = await fetch('/api/journey/stages/bootstrap', {
          method: 'POST',
          credentials: 'include',
        });

        if (!bootstrapStagesRes.ok) {
          const errorText = await bootstrapStagesRes.text();
          console.error('[PostAuth] Stages bootstrap failed:', {
            status: bootstrapStagesRes.status,
            statusText: bootstrapStagesRes.statusText,
            body: errorText,
          });
          throw new Error(`Stages bootstrap failed: ${bootstrapStagesRes.status}`);
        }

        const bootstrapResult = await bootstrapStagesRes.json();
        console.log('[PostAuth] ✅ Fresh stages bootstrapped:', bootstrapResult);
      }
    } catch (err) {
      console.error('[PostAuth] ❌ Critical: Stages setup failed:', err);
      throw err; // This is critical
    }

    // ============================================================
    // STEP 7: Check profile completeness and determine route
    // ============================================================
    console.log('[PostAuth] Step 7/8: Checking profile completeness...');
    let targetRoute = '/trial'; // Default route for new users - show trial screen first

    try {
      // Fetch profile directly from database (client-safe query)
      // Query ONLY real DB columns (no gender_he, goal_he, etc.)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, age, gender, height_cm, weight_kg, target_weight_kg, goal, diet, activity_level')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('[PostAuth] Error fetching profile:', profileError);
      }

      // Get current user metadata
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userMetadata = currentUser?.user_metadata || {};

      // Compute merged profile for completeness check
      // Calculate age from birthdate if available
      let calculatedAge = profileData?.age ?? userMetadata.age ?? null;
      if (!calculatedAge && userMetadata.birthdate) {
        try {
          const birthDate = new Date(userMetadata.birthdate);
          const today = new Date();
          calculatedAge = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
          }
          if (calculatedAge < 13 || calculatedAge > 120) calculatedAge = null;
        } catch {
          calculatedAge = null;
        }
      }

      const mergedProfile = {
        age: calculatedAge,
        gender: normalizeGender(profileData?.gender ?? userMetadata.gender),
        height_cm: profileData?.height_cm ?? userMetadata.height_cm ?? null,
        weight_kg: profileData?.weight_kg ?? userMetadata.weight_kg ?? null,
        goal: normalizeGoal(profileData?.goal ?? userMetadata.goals?.[0]),
      };

      console.log('[PostAuth] Merged profile for completeness:', mergedProfile);

      // Check completeness using merged data
      const isComplete = !!(
        mergedProfile.age &&
        mergedProfile.gender &&
        mergedProfile.height_cm &&
        mergedProfile.weight_kg &&
        mergedProfile.goal
      );

      console.log('[PostAuth] Profile completeness:', isComplete ? 'COMPLETE' : 'INCOMPLETE');

      if (!isComplete) {
        console.log('[PostAuth] Profile incomplete, redirecting to /profile/edit');
        targetRoute = '/profile/edit';
      } else {
        console.log('[PostAuth] Profile complete, new user will see trial screen at /trial');
      }
    } catch (err) {
      console.error('[PostAuth] Error checking profile completeness:', err);
      // On error, fall back to /trial for new users
    }

    // ============================================================
    // STEP 8: Cleanup and prepare for navigation
    // ============================================================
    console.log('[PostAuth] Step 8/8: Cleaning up temporary data...');
    try {
      // Clear onboarding data
      clearOnboardingData();
      console.log('[PostAuth] Onboarding data cleared');

      // Clear program draft
      await clearProgramDraft(storage);
      console.log('[PostAuth] Program draft cleared');

      console.log('[PostAuth] ========================================');
      console.log('[PostAuth] ✅ Post-auth flow completed successfully');
      console.log('[PostAuth] Provider:', provider);
      console.log('[PostAuth] Target route:', targetRoute);
      console.log('[PostAuth] ========================================');
    } catch (err) {
      console.error('[PostAuth] Error during cleanup:', err);
      // Non-critical, continue to navigation
    }

    // Return the target route for the calling code to navigate to
    return targetRoute;
  } catch (err) {
    console.error('[PostAuth] ========================================');
    console.error('[PostAuth] ❌ Post-auth flow failed');
    console.error('[PostAuth] Error:', err);
    console.error('[PostAuth] ========================================');
    throw err;
  }
}
