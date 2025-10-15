/**
 * Backfill script to normalize existing workout programs
 *
 * Run with: npx tsx scripts/backfill-workouts.ts
 */

import * as dotenv from "dotenv";
dotenv.config();

import { supabaseService } from "../src/lib/supabase";
import { insertNormalizedWorkouts } from "../src/lib/normalizeWorkouts";

async function backfillWorkouts() {
  console.log("🔄 Starting workout backfill...\n");

  // Fetch all programs
  const { data: programs, error } = await supabaseService
    .from("programs")
    .select("id, user_id, workout_plan_text")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching programs:", error);
    process.exit(1);
  }

  if (!programs || programs.length === 0) {
    console.log("ℹ️  No programs found to backfill");
    return;
  }

  console.log(`📊 Found ${programs.length} programs to process\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const program of programs) {
    console.log(`\n🔍 Processing program ${program.id} for user ${program.user_id}`);

    if (!program.workout_plan_text) {
      console.log("  ⚠️  No workout_plan_text, skipping");
      failureCount++;
      continue;
    }

    try {
      const success = await insertNormalizedWorkouts(
        supabaseService,
        program.id,
        program.workout_plan_text
      );

      if (success) {
        console.log(`  ✅ Successfully normalized workouts for program ${program.id}`);
        successCount++;
      } else {
        console.log(`  ❌ Failed to normalize workouts for program ${program.id}`);
        failureCount++;
      }
    } catch (err: any) {
      console.error(`  ❌ Error processing program ${program.id}:`, err.message);
      failureCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`\n📈 Backfill complete:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failureCount}`);
  console.log(`   📊 Total: ${programs.length}\n`);
}

// Run backfill
backfillWorkouts()
  .then(() => {
    console.log("✨ Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("💥 Fatal error:", err);
    process.exit(1);
  });
