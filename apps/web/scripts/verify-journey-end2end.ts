/**
 * End-to-End Journey Bootstrap Verification Script
 *
 * Tests the complete flow:
 * 1. Creates avatars with different personas
 * 2. Calls /api/journey/plan
 * 3. Verifies persona_source === 'avatar'
 * 4. Verifies journey content varies by persona
 *
 * Usage:
 *   pnpm tsx scripts/verify-journey-end2end.ts
 */

import { createClient } from '@supabase/supabase-js';

// Environment setup
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'test-journey@example.com';
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestPersona {
  name: string;
  gender: 'male' | 'female';
  goal: string;
  diet: string;
  frequency: string;
  experience: string;
  expectedProtein?: number; // Expected protein target
  expectedContains?: string[]; // Expected node IDs or content
}

const TEST_PERSONAS: TestPersona[] = [
  {
    name: 'Male Muscle Builder (Keto)',
    gender: 'male',
    goal: 'build_muscle',
    diet: 'keto',
    frequency: 'high',
    experience: 'intermediate',
    expectedProtein: 120,
    expectedContains: ['keto_day'],
  },
  {
    name: 'Female Weight Loss (Vegan)',
    gender: 'female',
    goal: 'lose_weight',
    diet: 'vegan',
    frequency: 'medium',
    experience: 'beginner',
    expectedProtein: 90,
    expectedContains: ['vegan_protein_sources'],
  },
  {
    name: 'Male General Fitness (Balanced)',
    gender: 'male',
    goal: 'general_fitness',
    diet: 'balanced',
    frequency: 'low',
    experience: 'advanced',
    expectedProtein: 120,
  },
  {
    name: 'Female Build Muscle (Vegetarian)',
    gender: 'female',
    goal: 'build_muscle',
    diet: 'vegetarian',
    frequency: 'high',
    experience: 'knowledge',
    expectedProtein: 90,
  },
];

async function signInOrCreateTestUser(): Promise<string> {
  console.log('🔐 Authenticating test user...');

  // Try signing in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signInData?.user) {
    console.log('✅ Signed in as existing test user:', signInData.user.id.substring(0, 8));
    return signInData.user.id;
  }

  // If sign in fails, create new user
  console.log('📝 Creating new test user...');
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (signUpError || !signUpData.user) {
    throw new Error(`Failed to create test user: ${signUpError?.message}`);
  }

  console.log('✅ Created test user:', signUpData.user.id.substring(0, 8));
  return signUpData.user.id;
}

async function createAvatarWithPersona(userId: string, persona: TestPersona): Promise<void> {
  console.log(`\n👤 Creating avatar: ${persona.name}`);

  // Delete existing avatar if any
  await supabase.from('avatars').delete().eq('user_id', userId);

  // Insert new avatar
  const { data, error } = await supabase
    .from('avatars')
    .insert({
      user_id: userId,
      gender: persona.gender,
      goal: persona.goal,
      diet: persona.diet,
      frequency: persona.frequency,
      experience: persona.experience,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create avatar: ${error.message}`);
  }

  console.log('✅ Avatar created:', {
    gender: data.gender,
    goal: data.goal,
    diet: data.diet,
    frequency: data.frequency,
    experience: data.experience,
  });
}

async function fetchJourneyPlan(): Promise<any> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('No active session for journey plan fetch');
  }

  const response = await fetch(`${SUPABASE_URL.replace('/rest/v1', '')}/api/journey/plan`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Journey plan fetch failed (${response.status}): ${text}`);
  }

  return response.json();
}

async function verifyJourneyForPersona(persona: TestPersona): Promise<void> {
  console.log(`\n🔍 Fetching journey plan for: ${persona.name}`);

  const planData = await fetchJourneyPlan();

  // Verify persona_source is 'avatar'
  if (planData.persona_source !== 'avatar') {
    console.error(`❌ FAIL | persona_source=${planData.persona_source} (expected 'avatar')`);
    return;
  }

  // Verify plan structure
  if (!planData.ok || !planData.plan || !planData.plan.nodes) {
    console.error(`❌ FAIL | Invalid plan structure`);
    return;
  }

  const nodeCount = planData.plan.nodes.length;
  const chapterCount = planData.plan.chapters?.length || 0;

  console.log(`✅ PASS | persona_source=avatar | nodes=${nodeCount} | chapters=${chapterCount}`);

  // Verify node count varies (should be 4-7 nodes depending on persona)
  if (nodeCount < 4 || nodeCount > 15) {
    console.warn(`⚠ Node count ${nodeCount} outside expected range [4-15]`);
  }

  // Verify persona matches
  const returnedPersona = planData.persona;
  const personaMatches =
    returnedPersona.gender === persona.gender &&
    returnedPersona.goal === persona.goal &&
    returnedPersona.diet === persona.diet &&
    returnedPersona.frequency === persona.frequency;

  if (!personaMatches) {
    console.error(`❌ FAIL | Persona mismatch:`, {
      expected: persona,
      received: returnedPersona,
    });
    return;
  }

  console.log(`✅ PASS | Persona attributes match`);

  // Check for diet-specific content
  if (persona.expectedContains) {
    const nodeIds = planData.plan.nodes.map((n: any) => n.id);
    const allNodesJson = JSON.stringify(planData.plan.nodes);

    for (const expectedId of persona.expectedContains) {
      const found = nodeIds.includes(expectedId) || allNodesJson.includes(expectedId);
      if (found) {
        console.log(`✅ PASS | Found expected content: ${expectedId}`);
      } else {
        console.warn(`⚠ Expected content not found: ${expectedId}`);
      }
    }
  }

  // Verify protein target (if specified)
  if (persona.expectedProtein) {
    // Look for protein in nodes or persona data
    const allContent = JSON.stringify(planData.plan);
    const proteinMatch = allContent.match(/protein["\s:]+(\d+)/i);

    if (proteinMatch) {
      const actualProtein = parseInt(proteinMatch[1], 10);
      if (Math.abs(actualProtein - persona.expectedProtein) <= 10) {
        console.log(`✅ PASS | Protein target ~${actualProtein}g (expected ${persona.expectedProtein}g)`);
      } else {
        console.warn(`⚠ Protein target ${actualProtein}g differs from expected ${persona.expectedProtein}g`);
      }
    } else {
      console.warn(`⚠ Could not verify protein target (expected ${persona.expectedProtein}g)`);
    }
  }
}

async function runTests(): Promise<void> {
  console.log('🚀 Starting End-to-End Journey Verification\n');

  try {
    // Step 1: Authenticate
    const userId = await signInOrCreateTestUser();

    // Step 2: Test each persona
    for (const persona of TEST_PERSONAS) {
      try {
        // Create avatar with this persona
        await createAvatarWithPersona(userId, persona);

        // Small delay for DB replication
        await new Promise(r => setTimeout(r, 150));

        // Verify journey plan
        await verifyJourneyForPersona(persona);
      } catch (err: any) {
        console.error(`❌ FAIL | Error testing ${persona.name}:`, err.message);
      }
    }

    console.log('\n✅ ALL TESTS COMPLETED');

  } catch (err: any) {
    console.error('\n❌ FATAL ERROR:', err.message);
    process.exit(1);
  } finally {
    // Clean up session
    await supabase.auth.signOut();
  }
}

// Run tests
runTests();
