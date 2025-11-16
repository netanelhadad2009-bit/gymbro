/**
 * Test Validation Helpers
 * Validates database entries and plan quality for registered test users
 */

import * as path from 'path';
import { config } from 'dotenv';
config({ path: path.join(process.cwd(), '.env.local') });

import { createClient } from '@supabase/supabase-js';
import { TestUserProfile } from './test-data-generator';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export interface ValidationResult {
  userId: string;
  email: string;
  checks: {
    authUserExists: boolean;
    profileExists: boolean;
    avatarExists: boolean;
    nutritionPlanExists: boolean;
    nutritionStatusReady: boolean;
    avatarMatches: boolean;
    stagesExist: boolean;
    nutritionQuality: boolean;
    caloriesInRange: boolean;
  };
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

/**
 * Validate a single user's registration
 */
export async function validateUser(
  email: string,
  expectedProfile: TestUserProfile
): Promise<ValidationResult> {
  const result: ValidationResult = {
    userId: '',
    email,
    checks: {
      authUserExists: false,
      profileExists: false,
      avatarExists: false,
      nutritionPlanExists: false,
      nutritionStatusReady: false,
      avatarMatches: false,
      stagesExist: false,
      nutritionQuality: false,
      caloriesInRange: false,
    },
    errors: [],
    warnings: [],
    details: {},
  };

  try {
    // 1. Check auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      result.errors.push(`Auth query error: ${authError.message}`);
      return result;
    }

    const user = authUser.users.find(u => u.email === email);

    if (!user) {
      result.errors.push('User not found in auth.users');
      return result;
    }

    result.checks.authUserExists = true;
    result.userId = user.id;
    result.details.authUser = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata,
    };

    // 2. Check profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      result.errors.push(`Profile not found: ${profileError?.message || 'Missing'}`);
    } else {
      result.checks.profileExists = true;
      result.details.profile = profile;

      // Check nutrition plan
      if (profile.nutrition_plan) {
        result.checks.nutritionPlanExists = true;

        // Validate nutrition plan structure
        const nutritionQuality = validateNutritionPlan(profile.nutrition_plan);
        result.checks.nutritionQuality = nutritionQuality.valid;
        if (!nutritionQuality.valid) {
          result.errors.push(...nutritionQuality.errors);
        }
        result.warnings.push(...nutritionQuality.warnings);

        // Check calories in range
        if (profile.nutrition_calories) {
          const targetCalories = calculateTargetCalories(expectedProfile);
          const diff = Math.abs(profile.nutrition_calories - targetCalories);
          result.checks.caloriesInRange = diff <= 200;

          if (!result.checks.caloriesInRange) {
            result.warnings.push(
              `Calories out of range: ${profile.nutrition_calories} vs target ${targetCalories} (diff: ${diff})`
            );
          }

          result.details.calories = {
            actual: profile.nutrition_calories,
            target: targetCalories,
            difference: diff,
          };
        }
      } else {
        result.errors.push('Nutrition plan is null');
      }

      // Check nutrition status
      if (profile.nutrition_status === 'ready') {
        result.checks.nutritionStatusReady = true;
      } else {
        result.errors.push(`Nutrition status is '${profile.nutrition_status}', expected 'ready'`);
      }
    }

    // 3. Check avatars table
    const { data: avatar, error: avatarError } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (avatarError || !avatar) {
      result.errors.push(`Avatar not found: ${avatarError?.message || 'Missing'}`);
    } else {
      result.checks.avatarExists = true;
      result.details.avatar = avatar;

      // Validate avatar matches expected profile
      const avatarMatches = validateAvatarMatch(avatar, expectedProfile);
      result.checks.avatarMatches = avatarMatches.matches;
      if (!avatarMatches.matches) {
        result.errors.push(...avatarMatches.errors);
      }
    }

    // 4. Check journey stages (implementation depends on your schema)
    // Assuming there's a journey_stages or user_stages table
    const { data: stages, error: stagesError } = await supabase
      .from('user_stages')
      .select('*')
      .eq('user_id', user.id);

    if (stagesError) {
      result.warnings.push(`Stages query error: ${stagesError.message}`);
    } else if (stages && stages.length > 0) {
      result.checks.stagesExist = true;
      result.details.stagesCount = stages.length;
    } else {
      result.warnings.push('No journey stages found');
    }

  } catch (error: any) {
    result.errors.push(`Validation exception: ${error.message}`);
  }

  return result;
}

/**
 * Validate nutrition plan structure and quality
 */
function validateNutritionPlan(nutritionPlan: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if it's valid JSON
    const plan = typeof nutritionPlan === 'string' ? JSON.parse(nutritionPlan) : nutritionPlan;

    // Check meta exists
    if (!plan.meta) {
      errors.push('Nutrition plan missing meta object');
      return { valid: false, errors, warnings };
    }

    // Check required meta fields
    const requiredMetaFields = [
      'start_date',
      'days',
      'goal',
      'activity_level',
      'calories_target',
      'protein_target_g',
      'carbs_target_g',
      'fat_target_g',
    ];

    for (const field of requiredMetaFields) {
      if (!plan.meta[field]) {
        errors.push(`Nutrition meta missing field: ${field}`);
      }
    }

    // Check meals_flat exists and has meals
    if (!plan.meals_flat || !Array.isArray(plan.meals_flat)) {
      errors.push('Nutrition plan missing meals_flat array');
      return { valid: false, errors, warnings };
    }

    if (plan.meals_flat.length === 0) {
      errors.push('Nutrition plan has no meals');
      return { valid: false, errors, warnings };
    }

    // Check meal structure
    const requiredMealFields = [
      'day',
      'order',
      'title',
      'kcal',
      'protein_g',
      'carbs_g',
      'fat_g',
    ];

    for (const meal of plan.meals_flat) {
      for (const field of requiredMealFields) {
        if (meal[field] === undefined || meal[field] === null) {
          errors.push(`Meal missing field: ${field}`);
        }
      }
    }

    // Check macros reasonableness
    const meta = plan.meta;
    if (meta.calories_target < 1000 || meta.calories_target > 5000) {
      warnings.push(`Unusual calories target: ${meta.calories_target}`);
    }

    if (meta.protein_target_g < 50 || meta.protein_target_g > 300) {
      warnings.push(`Unusual protein target: ${meta.protein_target_g}g`);
    }

  } catch (error: any) {
    errors.push(`Nutrition plan validation error: ${error.message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate expected target calories for a user
 */
function calculateTargetCalories(profile: TestUserProfile): number {
  // Simple estimation for validation purposes
  // This should match your actual calculation logic

  // Base on gender, weight, height, activity
  const isMale = profile.gender === 'male';
  const weight = profile.weight_kg;
  const height = profile.height_cm;
  const age = profile.age;

  // Mifflin-St Jeor equation
  let bmr: number;
  if (isMale) {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multiplier
  const activityMultipliers = {
    low: 1.375,
    medium: 1.55,
    high: 1.725,
  };

  const tdee = bmr * activityMultipliers[profile.training_frequency_actual];

  // Goal adjustment
  const goalAdjustments: Record<string, number> = {
    loss: -500,
    gain: 300,
    recomp: 0,
    maintain: 0,
  };

  const goal = profile.goals[0];
  const adjustment = goalAdjustments[goal] || 0;

  return Math.round(tdee + adjustment);
}

/**
 * Validate avatar matches expected profile
 */
function validateAvatarMatch(
  avatar: any,
  expectedProfile: TestUserProfile
): { matches: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check gender
  if (avatar.gender !== expectedProfile.gender) {
    errors.push(
      `Avatar gender mismatch: ${avatar.gender} vs expected ${expectedProfile.gender}`
    );
  }

  // Check goal (map from Hebrew to English if needed)
  const goalMapping: Record<string, string> = {
    'ירידה במשקל': 'loss',
    'עלייה במסת שריר': 'bulk',
    'ריקומפוזיציה': 'recomp',
    'שמירה על משקל': 'cut',
  };

  const expectedGoal = expectedProfile.goals[0];
  // Avatar uses different goal values, map accordingly
  const avatarGoalNormalized = avatar.goal;

  // For now, just check it exists
  if (!avatar.goal) {
    errors.push('Avatar missing goal');
  }

  // Check experience
  const experienceMapping: Record<string, string> = {
    never: 'beginner',
    time: 'beginner',
    sure: 'intermediate',
    results: 'intermediate',
    knowledge: 'advanced',
  };

  const expectedExp = experienceMapping[expectedProfile.experience] || expectedProfile.experience;

  if (avatar.experience !== expectedExp && avatar.experience !== expectedProfile.experience) {
    // Allow some flexibility in experience mapping
    errors.push(
      `Avatar experience mismatch: ${avatar.experience} vs expected ${expectedExp}`
    );
  }

  // Check diet
  if (avatar.diet !== expectedProfile.diet) {
    errors.push(
      `Avatar diet mismatch: ${avatar.diet} vs expected ${expectedProfile.diet}`
    );
  }

  // Check frequency
  if (avatar.frequency !== expectedProfile.training_frequency_actual) {
    errors.push(
      `Avatar frequency mismatch: ${avatar.frequency} vs expected ${expectedProfile.training_frequency_actual}`
    );
  }

  return {
    matches: errors.length === 0,
    errors,
  };
}

/**
 * Batch validate multiple users
 */
export async function validateUsers(
  users: Array<{ email: string; profile: TestUserProfile }>
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  for (const user of users) {
    console.log(`Validating ${user.email}...`);
    const result = await validateUser(user.email, user.profile);
    results.push(result);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Generate validation summary
 */
export function generateValidationSummary(results: ValidationResult[]): {
  totalUsers: number;
  successfulRegistrations: number;
  checksPassRate: Record<string, number>;
  errorSummary: Record<string, number>;
  warningSummary: Record<string, number>;
} {
  const totalUsers = results.length;
  const successfulRegistrations = results.filter(
    r => r.checks.authUserExists && r.checks.profileExists
  ).length;

  const checksPassRate: Record<string, number> = {};
  for (const checkName of Object.keys(results[0]?.checks || {})) {
    const passed = results.filter(r => r.checks[checkName as keyof typeof r.checks]).length;
    checksPassRate[checkName] = Math.round((passed / totalUsers) * 100);
  }

  const errorSummary: Record<string, number> = {};
  const warningSummary: Record<string, number> = {};

  for (const result of results) {
    for (const error of result.errors) {
      errorSummary[error] = (errorSummary[error] || 0) + 1;
    }
    for (const warning of result.warnings) {
      warningSummary[warning] = (warningSummary[warning] || 0) + 1;
    }
  }

  return {
    totalUsers,
    successfulRegistrations,
    checksPassRate,
    errorSummary,
    warningSummary,
  };
}
