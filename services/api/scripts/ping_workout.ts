/**
 * Workout Plan Test Script
 * Tests the POST /ai/workout endpoint with a realistic payload
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

async function testWorkoutGeneration() {
  console.log('🏋️  Testing workout plan generation...\n');
  console.log(`Target: ${API_URL}/ai/workout\n`);

  const testPayload = {
    userId: "test-user-123",
    gender: "male",
    age: 28,
    weight: 92,
    targetWeight: 78,
    heightCm: 178,
    activityLevel: "intermediate",
    experienceLevel: "intermediate",
    goal: "שריפת שומן",
    workoutsPerWeek: 5,
    equipment: ["משקולות חופשיות", "מכונות"]
  };

  console.log('📤 Sending payload:', JSON.stringify(testPayload, null, 2));
  console.log('');

  const startTime = Date.now();

  try {
    const res = await fetch(`${API_URL}/ai/workout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
    });

    const elapsed = Date.now() - startTime;

    console.log(`📊 Response received in ${elapsed}ms`);
    console.log(`   Status: ${res.status} ${res.statusText}`);
    console.log('');

    const data = await res.json();

    console.log('📦 Response keys:', Object.keys(data));
    console.log('');

    if (data.ok) {
      console.log('✅ Success!');
      console.log(`   Days in plan: ${data.plan?.plan?.length ?? 0}`);

      if (data.warnings) {
        console.log(`   ⚠️  Warnings present:`, Object.keys(data.warnings));

        if (data.warnings.messages) {
          console.log(`      - Validation warnings: ${data.warnings.messages.length}`);
          data.warnings.messages.forEach((msg: string, i: number) => {
            console.log(`        ${i + 1}. ${msg.substring(0, 100)}`);
          });
        }

        if (data.warnings.missingExercises) {
          console.log(`      - Missing exercises: ${data.warnings.missingExercises.length}`);
          data.warnings.missingExercises.slice(0, 3).forEach((ex: any) => {
            console.log(`        - ${ex.exerciseName} (Day ${ex.dayOrder})`);
          });
        }
      } else {
        console.log('   ✨ No warnings - perfect plan!');
      }
    } else {
      console.log('❌ Error Response:');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Request failed after ${elapsed}ms:`, err.message);
    console.error('\n💡 Make sure the API server is running:');
    console.error('   cd services/api && pnpm dev\n');
    process.exit(1);
  }
}

testWorkoutGeneration();
