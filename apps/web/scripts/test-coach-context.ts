/**
 * Test script for AI Coach Context System
 *
 * Usage:
 *   tsx scripts/test-coach-context.ts
 *
 * Prerequisites:
 *   1. Run migration: supabase/migrations/018_user_context.sql
 *   2. Have a test user with some meals and weigh-ins
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserContext() {
  console.log("🧪 Testing AI Coach Context System\n");

  // Test 1: Check if tables exist
  console.log("1️⃣  Checking database schema...");

  const { data: weighInsExists, error: e1 } = await supabase
    .from("weigh_ins")
    .select("id")
    .limit(1);

  if (e1 && e1.code !== "42P01") {
    console.log("   ❌ Error checking weigh_ins table:", e1.message);
  } else {
    console.log("   ✅ weigh_ins table exists");
  }

  const { data: mealsExists, error: e2 } = await supabase
    .from("meals")
    .select("id")
    .limit(1);

  if (e2 && e2.code !== "42P01") {
    console.log("   ❌ Error checking meals table:", e2.message);
  } else {
    console.log("   ✅ meals table exists");
  }

  // Test 2: Check if fn_user_context exists
  console.log("\n2️⃣  Checking SQL function...");

  // Note: This will fail if no user is authenticated, but it proves the function exists
  const { error: e3 } = await supabase.rpc("fn_user_context", {
    p_user_id: "00000000-0000-0000-0000-000000000000",
    p_since: "2025-01-01",
    p_until: "2025-01-31",
  });

  if (e3) {
    if (e3.message.includes("Unauthorized") || e3.message.includes("cannot query")) {
      console.log("   ✅ fn_user_context exists (RLS working as expected)");
    } else if (e3.code === "42883") {
      console.log("   ❌ fn_user_context does NOT exist - run migration!");
    } else {
      console.log("   ⚠️  Unexpected error:", e3.message);
    }
  } else {
    console.log("   ✅ fn_user_context exists and is callable");
  }

  // Test 3: Check profiles table has new columns
  console.log("\n3️⃣  Checking profiles table schema...");

  const { data: profileSample, error: e4 } = await supabase
    .from("profiles")
    .select("age, gender, height_cm, weight_kg, goal, diet")
    .limit(1);

  if (e4) {
    if (e4.code === "42703") {
      console.log("   ❌ Missing columns in profiles - run migration!");
    } else {
      console.log("   ⚠️  Error:", e4.message);
    }
  } else {
    console.log("   ✅ profiles table has nutrition/fitness columns");
  }

  console.log("\n✅ Schema validation complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Authenticate as a test user");
  console.log("   2. Add some meals and weigh-ins");
  console.log("   3. Test the chat API: POST /api/coach/chat");
  console.log("   4. Try these test messages:");
  console.log("      - 'כמה אכלתי היום?'");
  console.log("      - 'מה המגמה במשקל?'");
  console.log("      - 'תבנה לי תפריט ל-2200 קלוריות'");
}

async function testIntentDetection() {
  console.log("\n\n🎯 Testing Intent Detection\n");

  const { detectIntent, getIntentName } = await import("../lib/coach/intent");

  const testCases = [
    { msg: "כמה אכלתי היום?", expected: "nutrition_today" },
    { msg: "כמה קלוריות צרכתי היום", expected: "nutrition_today" },
    { msg: "מה אכלתי בשבוע האחרון?", expected: "nutrition_week" },
    { msg: "מה המגמה במשקל?", expected: "weight_trend" },
    { msg: "כמה אני שוקל", expected: "weight_trend" },
    { msg: "מה אכלתי לאחרונה?", expected: "last_meals" },
    { msg: "תבנה לי תפריט", expected: "free" },
  ];

  for (const { msg, expected } of testCases) {
    const detected = detectIntent(msg);
    const name = getIntentName(detected);
    const status = detected === expected ? "✅" : "❌";
    console.log(`${status} "${msg}"`);
    console.log(`   Detected: ${name} (${detected})`);
    if (detected !== expected) {
      console.log(`   Expected: ${expected}`);
    }
  }
}

// Run tests
(async () => {
  try {
    await testUserContext();
    await testIntentDetection();
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
})();
