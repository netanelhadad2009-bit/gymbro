/**
 * Automated Registration Test
 * Main orchestrator for testing 50 user registrations
 */

import * as path from 'path';
import { config } from 'dotenv';

const envPath = path.join(process.cwd(), '.env.local');
config({ path: envPath });

import { createClient } from '@supabase/supabase-js';
import {
  generateTestUsers,
  getOnboardingData,
  getNutritionRequest,
  printUserSummary,
  TestUserProfile,
} from './test-data-generator';
import { validateUser, ValidationResult } from './test-validation';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const WEB_BASE_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Retry helper for eventual consistency
 */
async function withRetries<T>(fn: () => Promise<T>, attempts = 5, delayMs = 400): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) console.log(`[E2E][Validate] retry ${i}/${attempts}`);
      return await fn();
    } catch (e) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw lastErr;
}

interface TestResult {
  user: TestUserProfile;
  success: boolean;
  steps: {
    nutritionGeneration: { success: boolean; duration: number; error?: string };
    registration: { success: boolean; duration: number; error?: string };
    avatarBootstrap: { success: boolean; duration: number; error?: string };
    sessionAttach: { success: boolean; duration: number; error?: string };
    stagesBootstrap: { success: boolean; duration: number; error?: string };
  };
  validation?: ValidationResult;
  totalDuration: number;
}

/**
 * Generate nutrition plan for a user
 */
async function generateNutritionPlan(user: TestUserProfile): Promise<{
  success: boolean;
  duration: number;
  plan?: any;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const nutritionReq = getNutritionRequest(user);

    const response = await fetch(`${API_BASE_URL}/api/ai/nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nutritionReq),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = (await response.json()) as any;

    if (!data.ok) {
      return {
        success: false,
        duration,
        error: 'API returned ok: false',
      };
    }

    return {
      success: true,
      duration,
      plan: data.json,
    };
  } catch (error: any) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Register a user with Supabase Auth
 */
async function registerUser(
  user: TestUserProfile,
  onboardingData: any
): Promise<{
  success: boolean;
  duration: number;
  userId?: string;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
      options: {
        data: onboardingData,
      },
    });

    const duration = Date.now() - startTime;

    if (error) {
      return {
        success: false,
        duration,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        duration,
        error: 'No user returned from signup',
      };
    }

    return {
      success: true,
      duration,
      userId: data.user.id,
    };
  } catch (error: any) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Bootstrap avatar for a user
 */
async function bootstrapAvatar(
  userId: string,
  accessToken: string
): Promise<{
  success: boolean;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${WEB_BASE_URL}/api/avatar/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return {
      success: true,
      duration,
    };
  } catch (error: any) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Attach nutrition plan to profile
 */
async function attachSession(
  nutritionPlan: any,
  accessToken: string
): Promise<{
  success: boolean;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${WEB_BASE_URL}/api/session/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        session: {
          nutrition: {
            status: 'ready',
            plan: nutritionPlan,
            fingerprint: `test-${Date.now()}`,
            calories: nutritionPlan?.meta?.calories_target || 2000,
          },
        },
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return {
      success: true,
      duration,
    };
  } catch (error: any) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Bootstrap journey stages
 */
async function bootstrapStages(
  accessToken: string
): Promise<{
  success: boolean;
  duration: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const response = await fetch(`${WEB_BASE_URL}/api/journey/stages/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        duration,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return {
      success: true,
      duration,
    };
  } catch (error: any) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Test a single user registration flow
 */
async function testUserRegistration(user: TestUserProfile): Promise<TestResult> {
  const overallStartTime = Date.now();
  console.log(`\n🧪 Testing ${user.email}...`);

  const result: TestResult = {
    user,
    success: false,
    steps: {
      nutritionGeneration: { success: false, duration: 0 },
      registration: { success: false, duration: 0 },
      avatarBootstrap: { success: false, duration: 0 },
      sessionAttach: { success: false, duration: 0 },
      stagesBootstrap: { success: false, duration: 0 },
    },
    totalDuration: 0,
  };

  // Step 1: Generate Nutrition Plan
  console.log('  → Generating nutrition plan...');
  const nutritionResult = await generateNutritionPlan(user);
  result.steps.nutritionGeneration = nutritionResult;

  if (!nutritionResult.success) {
    console.log(`  ✗ Nutrition generation failed: ${nutritionResult.error}`);
    result.totalDuration = Date.now() - overallStartTime;
    return result;
  }

  console.log(`  ✓ Nutrition generated in ${nutritionResult.duration}ms`);

  // Step 2: Register User
  console.log('  → Registering user...');
  const onboardingData = getOnboardingData(user);
  const registrationResult = await registerUser(user, onboardingData);
  result.steps.registration = registrationResult;

  if (!registrationResult.success) {
    console.log(`  ✗ Registration failed: ${registrationResult.error}`);
    result.totalDuration = Date.now() - overallStartTime;
    return result;
  }

  console.log(`  ✓ User registered in ${registrationResult.duration}ms`);

  // Get access token for authenticated requests
  const { data: sessionData } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });

  if (!sessionData.session) {
    console.log('  ✗ Failed to get session after registration');
    result.totalDuration = Date.now() - overallStartTime;
    return result;
  }

  const accessToken = sessionData.session.access_token;

  // Step 3: Bootstrap Avatar
  console.log('  → Bootstrapping avatar...');
  const avatarResult = await bootstrapAvatar(registrationResult.userId!, accessToken);
  result.steps.avatarBootstrap = avatarResult;

  if (!avatarResult.success) {
    console.log(`  ✗ Avatar bootstrap failed: ${avatarResult.error}`);
  } else {
    console.log(`  ✓ Avatar bootstrapped in ${avatarResult.duration}ms`);
  }

  // Step 4: Attach Nutrition Plan
  console.log('  → Attaching nutrition plan...');
  const attachResult = await attachSession(nutritionResult.plan, accessToken);
  result.steps.sessionAttach = attachResult;

  if (!attachResult.success) {
    console.log(`  ✗ Session attach failed: ${attachResult.error}`);
  } else {
    console.log(`  ✓ Session attached in ${attachResult.duration}ms`);
  }

  // Wait for DB replication
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 5: Bootstrap Journey Stages
  console.log('  → Bootstrapping stages...');
  const stagesResult = await bootstrapStages(accessToken);
  result.steps.stagesBootstrap = stagesResult;

  if (!stagesResult.success) {
    console.log(`  ✗ Stages bootstrap failed: ${stagesResult.error}`);
  } else {
    console.log(`  ✓ Stages bootstrapped in ${stagesResult.duration}ms`);
  }

  // Determine overall success
  result.success =
    nutritionResult.success &&
    registrationResult.success &&
    avatarResult.success &&
    attachResult.success &&
    stagesResult.success;

  result.totalDuration = Date.now() - overallStartTime;

  console.log(
    result.success
      ? `  ✅ Registration complete in ${result.totalDuration}ms`
      : `  ⚠️ Registration completed with errors in ${result.totalDuration}ms`
  );

  // Step 6: Validate
  console.log('  → Validating...');
  const validation = await withRetries(() => validateUser(user.email, user));
  result.validation = validation;

  const passedChecks = Object.values(validation.checks).filter(Boolean).length;
  const totalChecks = Object.keys(validation.checks).length;

  console.log(`  📊 Validation: ${passedChecks}/${totalChecks} checks passed`);
  if (validation.errors.length > 0) {
    console.log(`  ⚠️ ${validation.errors.length} errors found`);
  }

  // Sign out
  await supabase.auth.signOut();

  return result;
}

/**
 * Main test runner
 */
async function runTests(count: number = 50) {
  console.log('🚀 Starting Automated Registration Tests\n');
  console.log(`═══════════════════════════════════════════════════\n`);

  // Generate test users
  const allUsers = generateTestUsers();
  const testUsers = allUsers.slice(0, count);

  printUserSummary(testUsers);

  console.log(`\nTesting ${testUsers.length} users...\n`);
  console.log(`═══════════════════════════════════════════════════\n`);

  const results: TestResult[] = [];
  const startTime = Date.now();

  // Test each user sequentially
  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];

    console.log(`\n[${i + 1}/${testUsers.length}]`);

    const result = await testUserRegistration(user);
    results.push(result);

    // Small delay between users
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const totalDuration = Date.now() - startTime;

  // Save results to file
  const resultsData = {
    timestamp: new Date().toISOString(),
    totalUsers: testUsers.length,
    totalDuration,
    results,
  };

  const fs = await import('fs/promises');
  const resultsPath = `${__dirname}/test-results-${Date.now()}.json`;
  await fs.writeFile(resultsPath, JSON.stringify(resultsData, null, 2));

  console.log(`\n\n═══════════════════════════════════════════════════`);
  console.log(`📊 Test Results Summary\n`);
  console.log(`Results saved to: ${resultsPath}`);
  console.log(`\nRun: npx ts-node scripts/test-results-report.ts ${resultsPath}`);
  console.log(`═══════════════════════════════════════════════════\n`);

  return results;
}

// CLI execution
const args = process.argv.slice(2);
const count = args[0] ? parseInt(args[0], 10) : 50;

runTests(count)
  .then(() => {
    console.log('✅ Tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
