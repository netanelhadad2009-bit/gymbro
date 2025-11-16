/**
 * Nutrition API Test Utility
 *
 * Usage in browser console:
 *   testNutrition()
 *
 * This will call the /api/ai/nutrition endpoint with sample data
 * and print the response with full error details.
 */

async function testNutrition() {
  console.log('[TEST] Starting nutrition API test...');

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

  console.log('[TEST] Request payload:', payload);

  try {
    const startTime = Date.now();
    console.log('[TEST] Sending request to /api/ai/nutrition...');

    const res = await fetch('/api/ai/nutrition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const elapsed = Date.now() - startTime;
    console.log(`[TEST] Response received in ${elapsed}ms with status ${res.status}`);

    const json = await res.json();

    console.log('[TEST] Response status:', res.status);
    console.log('[TEST] Response headers:', Object.fromEntries(res.headers.entries()));
    console.log('[TEST] Response body:', json);

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
      console.error('❌ [TEST] FAILED - Server returned error');
      console.error('[TEST] Error details:', {
        ok: json.ok,
        error: json.error,
        message: json.message,
        details: json.details,
      });
    }

    return json;
  } catch (e) {
    console.error('❌ [TEST] EXCEPTION during fetch:', {
      name: e?.name,
      message: e?.message,
      stack: e?.stack,
    });
    throw e;
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.testNutrition = testNutrition;
  console.log('✅ testNutrition() is now available in console');
}
