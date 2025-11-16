/**
 * Node.js test script for nutrition API
 * Run with: node test-nutrition-node.js
 */

async function testNutrition() {
  console.log('\n[TEST] Starting nutrition API test...\n');

  const payload = {
    gender_he: 'זכר',
    age: 23,
    height_cm: 173,
    weight_kg: 55,
    target_weight_kg: 75,
    activity_level_he: 'גבוהה',
    goal_he: 'recomp',
    diet_type_he: 'טבעוני',
    days: 1
  };

  console.log('[TEST] Request payload:', JSON.stringify(payload, null, 2));
  console.log('\n[TEST] Sending request to http://localhost:3000/api/ai/nutrition...\n');

  const startTime = Date.now();

  try {
    const res = await fetch('http://localhost:3000/api/ai/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const elapsed = Date.now() - startTime;
    console.log(`[TEST] Response received in ${elapsed}ms with status ${res.status}\n`);

    const json = await res.json();

    console.log('[TEST] Response status:', res.status);
    console.log('[TEST] Response headers:', Object.fromEntries(res.headers.entries()));
    console.log('\n[TEST] Response body:', JSON.stringify(json, null, 2));
    console.log('\n');

    if (res.ok) {
      console.log('✅ [TEST] SUCCESS - Nutrition plan generated');
      console.log('[TEST] Plan summary:', {
        ok: json.ok,
        calories: json.calories || json.plan?.dailyTargets?.calories,
        daysCount: json.plan?.days?.length,
        firstMeal: json.plan?.days?.[0]?.meals?.[0]?.name,
        fingerprint: json.fingerprint?.substring(0, 12),
      });
    } else {
      console.log('❌ [TEST] FAILED - Server returned error');
      console.log('[TEST] Error details:', {
        ok: json.ok,
        error: json.error,
        message: json.message,
        details: json.details,
      });
    }

    return json;
  } catch (e) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ [TEST] EXCEPTION after ${elapsed}ms:`, {
      name: e?.name,
      message: e?.message,
      stack: e?.stack,
    });
    throw e;
  }
}

testNutrition()
  .then(() => {
    console.log('\n[TEST] Test completed\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n[TEST] Test failed:', err);
    process.exit(1);
  });
