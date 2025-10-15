/**
 * Integration Test for Workout Generation V2
 *
 * Tests the complete workflow: LLM generation → validation → DB resolution
 */

import { validatePlanOrThrow } from "../src/ai/validatePlan";
import { resolveExerciseIds } from "../src/ai/resolveExerciseIds";
import { supabaseService } from "../src/lib/supabase";

interface TestResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function testWorkoutEndpoint(): Promise<void> {
  console.log("🧪 Testing Workout Generation V2 Endpoint");
  console.log("=========================================\n");

  const testPayload = {
    userId: "test_integration_user",
    gender: "male",
    age: 28,
    weight: 92,
    targetWeight: 78,
    heightCm: 178,
    activityLevel: "intermediate",
    experienceLevel: "מתחיל",
    goal: "שריפת שומן",
    workoutsPerWeek: 5
  };

  const results: TestResult[] = [];

  try {
    // Make API call
    console.log("📡 Calling /ai/workout endpoint...");
    const startTime = Date.now();

    const response = await fetch("http://localhost:3001/ai/workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload)
    });

    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Response time: ${elapsed}ms\n`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API returned ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();

    // Test 1: Response structure
    results.push({
      passed: data.ok === true && !!data.plan,
      message: "Response has ok=true and plan object",
      details: { ok: data.ok, hasPlan: !!data.plan }
    });

    // Test 2: Plan has correct number of days
    const planDays = data.plan?.plan?.length || 0;
    results.push({
      passed: planDays === 5,
      message: `Plan has exactly 5 days`,
      details: { days: planDays }
    });

    // Test 3: Day orders are 1..5
    if (data.plan?.plan) {
      const orders = data.plan.plan.map((d: any) => d.order).sort((a: number, b: number) => a - b);
      results.push({
        passed: JSON.stringify(orders) === JSON.stringify([1, 2, 3, 4, 5]),
        message: "Day orders are consecutive 1..5",
        details: { orders }
      });
    }

    // Test 4: Total sets per day ≤ 25
    if (data.plan?.plan) {
      const setsPerDay = data.plan.plan.map((d: any) => ({ day: d.day_name, sets: d.total_sets }));
      const allUnder25 = data.plan.plan.every((d: any) => d.total_sets <= 25);
      results.push({
        passed: allUnder25,
        message: "All days have total_sets ≤ 25",
        details: { setsPerDay }
      });
    }

    // Test 5: Exercises per day 6-10
    if (data.plan?.plan) {
      const exerciseCounts = data.plan.plan.map((d: any) => ({
        day: d.day_name,
        count: d.exercises.length
      }));
      const allInRange = data.plan.plan.every((d: any) => d.exercises.length >= 6 && d.exercises.length <= 10);
      results.push({
        passed: allInRange,
        message: "All days have 6-10 exercises",
        details: { exerciseCounts }
      });
    }

    // Test 6: Check for warnings
    if (data.warnings?.missingExercises) {
      console.log("\n⚠️  Warnings found:");
      console.log("Missing exercises from DB:", data.warnings.missingExercises.length);
      data.warnings.missingExercises.forEach((ex: any) => {
        console.log(`  - Day ${ex.dayOrder} (${ex.dayName}): ${ex.exerciseName}`);
      });
    }

    // Test 7: Exercise IDs resolution
    if (data.plan?.plan) {
      let totalExercises = 0;
      let resolvedCount = 0;

      data.plan.plan.forEach((day: any) => {
        day.exercises.forEach((ex: any) => {
          totalExercises++;
          if (ex.id) resolvedCount++;
        });
      });

      results.push({
        passed: resolvedCount > 0,
        message: "At least some exercises have resolved IDs",
        details: { totalExercises, resolvedCount, percentage: Math.round((resolvedCount / totalExercises) * 100) }
      });
    }

    // Test 8: Goal mapping
    results.push({
      passed: data.plan?.goal === "cut",
      message: "Goal correctly mapped to 'cut'",
      details: { goal: data.plan?.goal }
    });

  } catch (error: any) {
    results.push({
      passed: false,
      message: "Endpoint call failed",
      details: { error: error.message }
    });
  }

  // Print results
  console.log("\n📊 Test Results");
  console.log("===============\n");

  let passedCount = 0;
  results.forEach((result, index) => {
    const icon = result.passed ? "✅" : "❌";
    console.log(`${icon} Test ${index + 1}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, JSON.stringify(result.details, null, 2));
    }
    if (result.passed) passedCount++;
  });

  console.log(`\n${passedCount}/${results.length} tests passed`);

  if (passedCount === results.length) {
    console.log("\n✅ All tests passed! Workout generation V2 is working correctly.\n");
    process.exit(0);
  } else {
    console.log("\n❌ Some tests failed. Please review the errors above.\n");
    process.exit(1);
  }
}

// Run test
testWorkoutEndpoint().catch((err) => {
  console.error("❌ Test script failed:", err);
  process.exit(1);
});
