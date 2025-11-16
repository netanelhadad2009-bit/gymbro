/**
 * Verification Script: Persona Normalization
 *
 * Tests that non-canonical persona values (like "results") are normalized correctly
 * and that avatar creation succeeds.
 *
 * Run with: pnpm --filter @gymbro/web exec tsx scripts/verify-persona-normalization.ts
 */

import { createClient } from '@supabase/supabase-js';
import {
  normalizeExperience,
  normalizeFrequency,
  normalizeDiet,
  normalizeGoal,
  normalizeGender,
  normalizePersona,
} from '../lib/persona/normalize';
import { buildJourneyFromPersona } from '../lib/journey/builder';

// Test cases for normalization
const normalizationTests = [
  // Experience variations
  { input: 'results', expected: 'knowledge', type: 'experience' },
  { input: 'outcomes', expected: 'knowledge', type: 'experience' },
  { input: 'novice', expected: 'beginner', type: 'experience' },
  { input: 'expert', expected: 'advanced', type: 'experience' },
  { input: 'busy', expected: 'time', type: 'experience' },
  { input: undefined, expected: 'beginner', type: 'experience' },

  // Frequency variations
  { input: 'rare', expected: 'low', type: 'frequency' },
  { input: 'moderate', expected: 'medium', type: 'frequency' },
  { input: 'frequent', expected: 'high', type: 'frequency' },

  // Diet variations
  { input: 'plant_based', expected: 'vegan', type: 'diet' },
  { input: 'ketogenic', expected: 'keto', type: 'diet' },
  { input: 'veggie', expected: 'vegetarian', type: 'diet' },
  { input: 'normal', expected: 'balanced', type: 'diet' },

  // Goal variations
  { input: 'weight_loss', expected: 'loss', type: 'goal' },
  { input: 'gain', expected: 'bulk', type: 'goal' },
  { input: 'tone', expected: 'recomp', type: 'goal' },

  // Gender variations
  { input: 'f', expected: 'female', type: 'gender' },
  { input: 'woman', expected: 'female', type: 'gender' },
  { input: 'm', expected: 'male', type: 'gender' },
];

function testNormalization() {
  console.log('\n🧪 Testing Persona Normalization\n');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  for (const test of normalizationTests) {
    let result;
    switch (test.type) {
      case 'experience':
        result = normalizeExperience(test.input);
        break;
      case 'frequency':
        result = normalizeFrequency(test.input);
        break;
      case 'diet':
        result = normalizeDiet(test.input);
        break;
      case 'goal':
        result = normalizeGoal(test.input);
        break;
      case 'gender':
        result = normalizeGender(test.input);
        break;
    }

    const status = result === test.expected ? '✅ PASS' : '❌ FAIL';
    if (result === test.expected) {
      passed++;
    } else {
      failed++;
    }

    const inputDisplay = test.input === undefined ? 'undefined' : `"${test.input}"`;
    console.log(
      `${status} | ${test.type.padEnd(12)} | ${inputDisplay.padEnd(20)} → ${result.padEnd(15)} ${
        result !== test.expected ? `(expected: ${test.expected})` : ''
      }`
    );
  }

  console.log('='.repeat(80));
  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  return failed === 0;
}

// Test personas with edge case values
const testPersonas = [
  {
    name: 'Edge Case: "results" experience',
    raw: {
      gender: 'male',
      goal: 'cut',
      diet: 'keto',
      frequency: 'high',
      experience: 'results', // ← This was causing the error
    },
  },
  {
    name: 'Edge Case: "plant_based" diet',
    raw: {
      gender: 'female',
      goal: 'weight_loss',
      diet: 'plant_based',
      frequency: 'moderate',
      experience: 'novice',
    },
  },
  {
    name: 'Edge Case: undefined values',
    raw: {
      gender: undefined,
      goal: undefined,
      diet: undefined,
      frequency: undefined,
      experience: undefined,
    },
  },
];

async function testAvatarCreation() {
  console.log('\n🧪 Testing Avatar Creation with Edge Cases\n');
  console.log('='.repeat(80));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let allPassed = true;

  for (const { name, raw } of testPersonas) {
    console.log(`\nTesting: ${name}`);
    console.log(`Raw persona:`, raw);

    // Normalize
    const normalized = normalizePersona(raw);
    console.log(`Normalized:`, normalized);

    // Generate journey to ensure it works
    const { nodes } = buildJourneyFromPersona(normalized);
    console.log(`Journey nodes: ${nodes.length}`);

    // Try to insert into database
    const testUserId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    try {
      const { data, error } = await supabase
        .from('avatars')
        .insert({
          user_id: testUserId,
          gender: normalized.gender,
          goal: normalized.goal,
          diet: normalized.diet,
          frequency: normalized.frequency,
          experience: normalized.experience,
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ FAIL: Insert failed with error:`, {
          code: error.code,
          message: error.message,
          details: error.details,
        });
        allPassed = false;
      } else {
        console.log(`✅ PASS: Avatar created successfully`);

        // Cleanup
        await supabase.from('avatars').delete().eq('user_id', testUserId);
      }
    } catch (err: any) {
      console.error(`❌ FAIL: Exception during insert:`, err.message);
      allPassed = false;
    }
  }

  console.log('='.repeat(80));
  return allPassed;
}

async function main() {
  console.log('🔍 PERSONA NORMALIZATION VERIFICATION');
  console.log('====================================');

  // Test 1: Normalization functions
  const normalizationPassed = testNormalization();

  // Test 2: Avatar creation with normalized values
  const avatarCreationPassed = await testAvatarCreation();

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('FINAL RESULTS');
  console.log('='.repeat(80));

  if (normalizationPassed && avatarCreationPassed) {
    console.log('✅ ALL TESTS PASSED');
    console.log('\n✓ Normalization functions work correctly');
    console.log('✓ Edge case values (like "results") are handled');
    console.log('✓ Avatar creation succeeds with normalized values');
    console.log('✓ Journey generation works with all personas');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    if (!normalizationPassed) console.log('✗ Normalization tests failed');
    if (!avatarCreationPassed) console.log('✗ Avatar creation tests failed');
    process.exit(1);
  }
}

main();
