/**
 * User Context Loader for AI Coach
 *
 * Single source of truth for loading and merging user profile data from multiple sources:
 * - profiles table (primary)
 * - profile_snapshot (JSON fallback)
 * - user_metadata (auth fallback)
 * - avatars table (persona only, never overrides body data)
 *
 * Ensures all fields are deterministically merged and logged for debugging.
 */

import { supabaseServer } from '@/lib/supabase-server';
import { normalizePersona } from '@/lib/persona/normalize';

export type UserContext = {
  userId: string;
  gender?: 'male' | 'female' | string;
  age?: number;
  birthdate?: string;
  height_cm?: number;
  weight_kg?: number;
  target_weight_kg?: number;
  activity?: string;
  goals?: string[];
  diet?: string;
  frequency?: 'low' | 'medium' | 'high' | string;
  experience?: 'beginner' | 'intermediate' | 'advanced' | 'knowledge' | 'time' | string;
  bmi?: number;
  persona?: {
    gender?: string;
    goal?: string;
    diet?: string;
    frequency?: string;
    experience?: string;
  };
  updatedAt?: string;
};

/** Source tracking for debugging */
type FieldSources = Record<string, string>;

/**
 * Remove undefined and null values from object
 * IMPORTANT: Keep 0 and empty strings - they are valid values
 */
function compact<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<T>;
}

/**
 * Parse and validate numeric field with range checking
 */
function parseNumeric(
  value: any,
  min: number,
  max: number
): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isFinite(num) && num >= min && num <= max ? num : undefined;
}

/**
 * Calculate age from birthdate string
 */
function calculateAge(birthdate: string): number | undefined {
  try {
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age > 0 && age < 120 ? age : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Load comprehensive user context for AI Coach
 *
 * Merges data from multiple sources with deterministic priority:
 * 1. profiles (direct columns)
 * 2. profile_snapshot (JSON from most recent AI message)
 * 3. user_metadata (from auth.user())
 * 4. avatars (persona hints only, never overrides body data)
 *
 * @returns UserContext with all available fields and source tracking
 */
export async function loadUserContext(): Promise<UserContext> {
  const supabase = supabaseServer();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { userId: 'anon' };
  }

  const userId = user.id;
  const sources: FieldSources = {};

  // 1) Load from profiles table (explicit column list + profile_snapshot if exists)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(
      `
      id,
      gender,
      date_of_birth,
      height_cm,
      weight_kg,
      target_weight_kg,
      activity_level,
      goal,
      diet,
      experience,
      workout_days_per_week,
      bmi,
      updated_at
    `
    )
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.warn('[Coach][loadUserContext] Profile fetch error:', profileError.message);
  }

  // 2) Try to load profile_snapshot from most recent AI message
  let snapshot: any = null;
  try {
    const { data: recentMsg } = await supabase
      .from('ai_messages')
      .select('profile_snapshot')
      .eq('user_id', userId)
      .not('profile_snapshot', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    snapshot = recentMsg?.profile_snapshot;
  } catch (err) {
    console.warn('[Coach][loadUserContext] Snapshot fetch failed (non-fatal):', err);
  }

  // 3) Get user_metadata from auth
  const metadata = user.user_metadata || {};

  // 4) Load from avatars table (persona only)
  const { data: avatar, error: avatarError } = await supabase
    .from('avatars')
    .select(`gender, goal, diet, frequency, experience`)
    .eq('user_id', userId)
    .maybeSingle();

  if (avatarError) {
    console.warn('[Coach][loadUserContext] Avatar fetch error:', avatarError.message);
  }

  const persona = avatar ? normalizePersona(avatar as any) : undefined;

  // 5) Deterministic merge with source tracking
  // Helper function to get value with source tracking
  const getValue = (key: string, ...candidates: Array<{ value: any; source: string }>) => {
    for (const { value, source } of candidates) {
      if (value !== null && value !== undefined) {
        sources[key] = source;
        return value;
      }
    }
    sources[key] = 'none';
    return undefined;
  };

  // Parse and validate numeric fields with range checking
  const height_cm = parseNumeric(
    getValue('height_cm',
      { value: profile?.height_cm, source: 'profiles' },
      { value: snapshot?.height_cm, source: 'snapshot' },
      { value: metadata?.height_cm, source: 'metadata' }
    ),
    120, 230
  );

  const weight_kg = parseNumeric(
    getValue('weight_kg',
      { value: profile?.weight_kg, source: 'profiles' },
      { value: snapshot?.weight_kg, source: 'snapshot' },
      { value: metadata?.weight_kg, source: 'metadata' }
    ),
    30, 250
  );

  const target_weight_kg = parseNumeric(
    getValue('target_weight_kg',
      { value: profile?.target_weight_kg, source: 'profiles' },
      { value: snapshot?.target_weight_kg, source: 'snapshot' },
      { value: metadata?.target_weight_kg, source: 'metadata' }
    ),
    30, 250
  );

  // Derive age from birthdate or direct age field
  const birthdate = getValue('birthdate',
    { value: profile?.date_of_birth, source: 'profiles' },
    { value: snapshot?.birthdate || snapshot?.date_of_birth, source: 'snapshot' },
    { value: metadata?.birthdate || metadata?.date_of_birth, source: 'metadata' }
  ) as string | undefined;

  const age = birthdate
    ? calculateAge(birthdate)
    : parseNumeric(
        getValue('age',
          { value: metadata?.age, source: 'metadata' }
        ),
        13, 120
      );

  // Calculate BMI (prioritize stored value, then calculate)
  const bmi =
    parseNumeric(profile?.bmi, 10, 60) ??
    (height_cm && weight_kg
      ? parseNumeric(weight_kg / Math.pow(height_cm / 100, 2), 10, 60)
      : undefined);

  // Merge other fields (profiles > snapshot > metadata > avatar)
  const gender = getValue('gender',
    { value: profile?.gender, source: 'profiles' },
    { value: snapshot?.gender, source: 'snapshot' },
    { value: metadata?.gender, source: 'metadata' },
    { value: persona?.gender, source: 'avatar' }
  ) as string | undefined;

  const activity = getValue('activity',
    { value: profile?.activity_level, source: 'profiles' },
    { value: snapshot?.activity || snapshot?.activity_level, source: 'snapshot' },
    { value: metadata?.activity || metadata?.activity_level, source: 'metadata' }
  ) as string | undefined;

  const diet = getValue('diet',
    { value: profile?.diet, source: 'profiles' },
    { value: snapshot?.diet, source: 'snapshot' },
    { value: metadata?.diet, source: 'metadata' },
    { value: persona?.diet, source: 'avatar' }
  ) as string | undefined;

  const experience = getValue('experience',
    { value: profile?.experience, source: 'profiles' },
    { value: snapshot?.experience, source: 'snapshot' },
    { value: metadata?.experience, source: 'metadata' },
    { value: persona?.experience, source: 'avatar' }
  ) as string | undefined;

  // Goals array
  const goalValue = getValue('goal',
    { value: profile?.goal, source: 'profiles' },
    { value: snapshot?.goal || snapshot?.goals?.[0], source: 'snapshot' },
    { value: metadata?.goal, source: 'metadata' },
    { value: persona?.goal, source: 'avatar' }
  );
  const goals = goalValue ? [goalValue as string] : undefined;

  // Frequency from workout_days_per_week or direct
  const frequency = profile?.workout_days_per_week
    ? (profile.workout_days_per_week <= 2
        ? 'low'
        : profile.workout_days_per_week <= 4
        ? 'medium'
        : 'high')
    : (getValue('frequency',
        { value: snapshot?.frequency, source: 'snapshot' },
        { value: metadata?.frequency, source: 'metadata' },
        { value: persona?.frequency, source: 'avatar' }
      ) as string | undefined);

  // Build final context
  const merged: UserContext = {
    userId,
    gender,
    age,
    birthdate,
    height_cm,
    weight_kg,
    target_weight_kg,
    activity,
    goals,
    diet,
    frequency,
    experience,
    bmi,
    persona: persona ? compact(persona) : undefined,
    updatedAt: profile?.updated_at as string | undefined,
  };

  // Strong debug logging with source tracking
  console.log('[Coach][Context] sources:', {
    height_cm: sources.height_cm || 'none',
    weight_kg: sources.weight_kg || 'none',
    target_weight_kg: sources.target_weight_kg || 'none',
    gender: sources.gender || 'none',
    age: sources.age || 'none',
    diet: sources.diet || 'none',
    goal: sources.goal || 'none',
  });
  console.debug('[Coach][Context] merged keys:', Object.keys(merged));
  console.debug('[Coach][Context] merged snapshot:', JSON.stringify(merged, null, 2));

  return compact(merged) as UserContext;
}
