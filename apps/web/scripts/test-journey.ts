#!/usr/bin/env tsx
/**
 * Journey API Test Script
 *
 * Tests the complete journey backend:
 * - GET /api/journey
 * - POST /api/journey/track
 * - POST /api/journey/complete
 *
 * Usage: tsx scripts/test-journey.ts
 */

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

const results: TestResult[] = [];

/**
 * Helper to make API requests
 */
async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ status: number; data: any; duration: number }> {
  const start = Date.now();
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      }
    });

    const data = await response.json();
    const duration = Date.now() - start;

    return { status: response.status, data, duration };

  } catch (err: any) {
    return {
      status: 0,
      data: { error: "NetworkError", message: err.message },
      duration: Date.now() - start
    };
  }
}

/**
 * Test 1: GET /api/journey (unauthenticated)
 */
async function testGetJourneyUnauth() {
  console.log("\n[Test 1] GET /api/journey (unauthenticated)");

  const { status, data, duration } = await apiRequest("/api/journey");

  if (status === 200 && data.ok && data.auth === false) {
    results.push({
      name: "GET /api/journey (unauth)",
      passed: true,
      message: `Returns empty structure (${duration}ms)`,
      duration
    });
    console.log("✓ PASS - Returns empty structure for unauthenticated users");
  } else {
    results.push({
      name: "GET /api/journey (unauth)",
      passed: false,
      message: `Expected 200 with auth:false, got ${status}`,
      duration
    });
    console.log("✗ FAIL - Unexpected response");
  }

  console.log("Response:", JSON.stringify(data, null, 2));
}

/**
 * Test 2: GET /api/journey (authenticated)
 * Note: This test requires valid auth cookies or session
 */
async function testGetJourneyAuth() {
  console.log("\n[Test 2] GET /api/journey (authenticated - if session exists)");

  const { status, data, duration } = await apiRequest("/api/journey");

  if (status === 200 && data.ok) {
    results.push({
      name: "GET /api/journey (auth)",
      passed: true,
      message: `Returns journey data (${duration}ms)`,
      duration
    });
    console.log("✓ PASS - Returns journey structure");
    console.log(`  Chapters: ${data.data?.chapters?.length || 0}`);
    console.log(`  Total Points: ${data.data?.total_points || 0}`);
    console.log(`  Total Badges: ${data.data?.total_badges || 0}`);
  } else if (status === 401) {
    results.push({
      name: "GET /api/journey (auth)",
      passed: true,
      message: "No session - skipped",
      duration
    });
    console.log("⊘ SKIP - No authenticated session available");
  } else {
    results.push({
      name: "GET /api/journey (auth)",
      passed: false,
      message: `Unexpected status ${status}`,
      duration
    });
    console.log("✗ FAIL - Unexpected response");
  }

  return data;
}

/**
 * Test 3: POST /api/journey/track (fake signal)
 */
async function testTrackTask() {
  console.log("\n[Test 3] POST /api/journey/track");

  const { status, data, duration } = await apiRequest("/api/journey/track", {
    method: "POST",
    body: JSON.stringify({
      task_key: "weigh_in_today",
      value: true,
      node_id: "00000000-0000-0000-0000-000000000101" // Demo node ID
    })
  });

  if (status === 200 || status === 401) {
    results.push({
      name: "POST /api/journey/track",
      passed: true,
      message: `Accepts request (${duration}ms)`,
      duration
    });
    console.log("✓ PASS - Endpoint responds correctly");

    if (data.ok) {
      console.log(`  Can Complete: ${data.can_complete}`);
      console.log(`  Satisfied: ${data.satisfied?.join(", ") || "none"}`);
      console.log(`  Missing: ${data.missing?.join(", ") || "none"}`);
    }
  } else {
    results.push({
      name: "POST /api/journey/track",
      passed: false,
      message: `Unexpected status ${status}`,
      duration
    });
    console.log("✗ FAIL - Unexpected response");
  }

  console.log("Response:", JSON.stringify(data, null, 2));
}

/**
 * Test 4: POST /api/journey/complete
 */
async function testCompleteNode() {
  console.log("\n[Test 4] POST /api/journey/complete");

  const { status, data, duration } = await apiRequest("/api/journey/complete", {
    method: "POST",
    body: JSON.stringify({
      node_id: "00000000-0000-0000-0000-000000000101" // Demo node ID
    })
  });

  if (status === 200 || status === 400 || status === 401) {
    results.push({
      name: "POST /api/journey/complete",
      passed: true,
      message: `Endpoint responds (${duration}ms)`,
      duration
    });
    console.log("✓ PASS - Endpoint responds correctly");

    if (data.ok) {
      console.log(`  Points Awarded: ${data.points_awarded}`);
      console.log(`  Next Node: ${data.next_node_id || "none"}`);
      console.log(`  Message: ${data.message}`);
    } else if (data.error === "ConditionsNotMet") {
      console.log("  ⚠ Conditions not met (expected for demo)");
      console.log(`  Missing: ${data.missing?.join(", ")}`);
    }
  } else {
    results.push({
      name: "POST /api/journey/complete",
      passed: false,
      message: `Unexpected status ${status}`,
      duration
    });
    console.log("✗ FAIL - Unexpected response");
  }

  console.log("Response:", JSON.stringify(data, null, 2));
}

/**
 * Test 5: Validate response structure
 */
async function testResponseStructure() {
  console.log("\n[Test 5] Validate response structure");

  const { data } = await apiRequest("/api/journey");

  const hasOk = typeof data.ok === "boolean";
  const hasAuth = typeof data.auth === "boolean";
  const hasData = data.auth === false || (data.data && typeof data.data === "object");

  if (hasOk && hasAuth && hasData) {
    results.push({
      name: "Response structure",
      passed: true,
      message: "All required fields present"
    });
    console.log("✓ PASS - Response structure is valid");
  } else {
    results.push({
      name: "Response structure",
      passed: false,
      message: `Missing fields: ok=${hasOk}, auth=${hasAuth}, data=${hasData}`
    });
    console.log("✗ FAIL - Invalid response structure");
  }
}

/**
 * Main test runner
 */
async function main() {
  console.log("═".repeat(60));
  console.log("Journey API Test Suite");
  console.log("═".repeat(60));
  console.log(`API Base: ${API_BASE}`);
  console.log(`Time: ${new Date().toISOString()}`);

  try {
    await testGetJourneyUnauth();
    await testGetJourneyAuth();
    await testTrackTask();
    await testCompleteNode();
    await testResponseStructure();

    // Summary
    console.log("\n" + "═".repeat(60));
    console.log("Test Summary");
    console.log("═".repeat(60));

    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach(r => {
      const icon = r.passed ? "✓" : "✗";
      const duration = r.duration ? ` (${r.duration}ms)` : "";
      console.log(`${icon} ${r.name}: ${r.message}${duration}`);
    });

    console.log("\n" + "─".repeat(60));
    console.log(`Total: ${passed}/${total} passed`);
    console.log("═".repeat(60));

    // Exit code
    process.exit(passed === total ? 0 : 1);

  } catch (err: any) {
    console.error("\n✗ Fatal error:", err.message);
    process.exit(1);
  }
}

main();
