/**
 * Backfill Script: Migrate Legacy Programs to Normalized Schema
 *
 * This script finds programs with workout_plan_text (legacy format)
 * and no workouts (not yet normalized), parses the text, and creates
 * normalized workouts + exercises.
 *
 * Run this as a server action or one-time migration script.
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  parseWorkoutPlanText,
  validateParsedProgram,
  generateProgramTitle,
  type ParsedWorkout,
} from "./workoutParser";

export interface BackfillResult {
  success: boolean;
  programsProcessed: number;
  programsMigrated: number;
  programsSkipped: number;
  errors: Array<{ programId: string; error: string }>;
}

export interface LegacyProgramRow {
  id: string;
  user_id: string;
  days_estimate: number | null;
  workout_plan_text: string | null;
  nutrition_plan_json: any | null;
  created_at: string;
}

/**
 * Main backfill function - migrates all legacy programs
 */
export async function backfillAllPrograms(): Promise<BackfillResult> {
  const supabase = await createServerSupabaseClient();
  const result: BackfillResult = {
    success: true,
    programsProcessed: 0,
    programsMigrated: 0,
    programsSkipped: 0,
    errors: [],
  };

  try {
    // Find all programs with workout_plan_text that haven't been normalized
    const { data: legacyPrograms, error: fetchError } = await supabase
      .from("programs")
      .select("id, user_id, days_estimate, workout_plan_text, nutrition_plan_json, created_at")
      .not("workout_plan_text", "is", null)
      .returns<LegacyProgramRow[]>();

    if (fetchError) {
      console.error("[Backfill] Error fetching programs:", fetchError);
      result.success = false;
      result.errors.push({ programId: "N/A", error: fetchError.message });
      return result;
    }

    if (!legacyPrograms || legacyPrograms.length === 0) {
      console.log("[Backfill] No legacy programs found");
      return result;
    }

    console.log(`[Backfill] Found ${legacyPrograms.length} programs with workout_plan_text`);

    // Process each program
    for (const program of legacyPrograms) {
      result.programsProcessed++;

      try {
        // Check if already normalized (has workouts)
        const { data: existingWorkouts } = await supabase
          .from("workouts")
          .select("id")
          .eq("program_id", program.id)
          .limit(1);

        if (existingWorkouts && existingWorkouts.length > 0) {
          console.log(`[Backfill] Program ${program.id} already normalized, skipping`);
          result.programsSkipped++;
          continue;
        }

        // Migrate this program
        await migrateSingleProgram(program);
        result.programsMigrated++;
        console.log(`[Backfill] Successfully migrated program ${program.id}`);
      } catch (error) {
        console.error(`[Backfill] Error migrating program ${program.id}:`, error);
        result.errors.push({
          programId: program.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(`[Backfill] Complete - Processed: ${result.programsProcessed}, Migrated: ${result.programsMigrated}, Skipped: ${result.programsSkipped}, Errors: ${result.errors.length}`);
  } catch (error) {
    console.error("[Backfill] Fatal error:", error);
    result.success = false;
    result.errors.push({
      programId: "N/A",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return result;
}

/**
 * Migrate a single legacy program to normalized schema
 */
export async function migrateSingleProgram(program: LegacyProgramRow): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Parse the workout text
  if (!program.workout_plan_text) {
    throw new Error("No workout_plan_text to migrate");
  }

  const parsed = parseWorkoutPlanText(program.workout_plan_text);
  const validation = validateParsedProgram(parsed);

  if (!validation.valid) {
    throw new Error(`Invalid parsed data: ${validation.errors.join(", ")}`);
  }

  // Extract metadata
  const meta = program.nutrition_plan_json?.meta || {};
  const goal = meta.goal || null;
  const startDate = meta.start_date || null;
  const title = generateProgramTitle(goal);

  // Update program with normalized fields
  const { error: updateError } = await supabase
    .from("programs")
    .update({
      title,
      goal,
      start_date: startDate,
      days_estimate: parsed.totalDays,
      updated_at: new Date().toISOString(),
    })
    .eq("id", program.id);

  if (updateError) {
    throw new Error(`Failed to update program: ${updateError.message}`);
  }

  // Insert workouts and exercises
  for (const workout of parsed.workouts) {
    await insertWorkoutWithExercises(program.id, workout);
  }

  // Insert nutrition plan if metadata exists
  if (program.nutrition_plan_json && Object.keys(program.nutrition_plan_json).length > 0) {
    const { error: nutritionError } = await supabase
      .from("nutrition_plans")
      .insert({
        program_id: program.id,
        meta: program.nutrition_plan_json,
      });

    if (nutritionError && nutritionError.code !== "23505") {
      // Ignore duplicate key errors
      console.warn(`[Backfill] Failed to insert nutrition plan for ${program.id}:`, nutritionError);
    }
  }
}

/**
 * Insert a workout and its exercises
 */
async function insertWorkoutWithExercises(
  programId: string,
  workout: ParsedWorkout
): Promise<void> {
  const supabase = await createServerSupabaseClient();

  // Insert workout
  const { data: workoutData, error: workoutError } = await supabase
    .from("workouts")
    .insert({
      program_id: programId,
      day_number: workout.dayNumber,
      title: workout.title,
      completed: false,
    })
    .select("id")
    .single();

  if (workoutError) {
    throw new Error(`Failed to insert workout: ${workoutError.message}`);
  }

  if (!workoutData) {
    throw new Error("Workout insert returned no data");
  }

  const workoutId = workoutData.id;

  // Insert exercises
  if (workout.exercises.length > 0) {
    const exercisesData = workout.exercises.map((exercise) => ({
      workout_id: workoutId,
      order_index: exercise.orderIndex,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
    }));

    const { error: exercisesError } = await supabase
      .from("workout_exercises")
      .insert(exercisesData);

    if (exercisesError) {
      throw new Error(`Failed to insert exercises: ${exercisesError.message}`);
    }
  }
}

/**
 * Backfill a specific program by ID (useful for testing)
 */
export async function backfillProgramById(programId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();

  const { data: program, error } = await supabase
    .from("programs")
    .select("id, user_id, days_estimate, workout_plan_text, nutrition_plan_json, created_at")
    .eq("id", programId)
    .single<LegacyProgramRow>();

  if (error) {
    throw new Error(`Program not found: ${error.message}`);
  }

  await migrateSingleProgram(program);
}
