/**
 * Exercise ID Resolver
 *
 * Resolves exercise IDs from Supabase exercise_library by exact Hebrew name match
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan, Exercise } from "./validatePlan";

export interface MissingExercise {
  dayOrder: number;
  dayName: string;
  exerciseName: string;
  exerciseOrder: number;
}

export interface ResolvedResult {
  planWithIds: Plan;
  missing: MissingExercise[];
}

/**
 * Resolve exercise IDs from database by exact name_he match
 *
 * @param supabase - Supabase client (should use service role key)
 * @param plan - Validated workout plan
 * @returns Plan with resolved IDs and list of missing exercises
 */
export async function resolveExerciseIds(
  supabase: SupabaseClient,
  plan: Plan
): Promise<ResolvedResult> {
  const missing: MissingExercise[] = [];

  // Collect all unique exercise names
  const allExerciseNames = new Set<string>();
  for (const day of plan.plan) {
    for (const exercise of day.exercises) {
      allExerciseNames.add(exercise.name_he);
    }
  }

  // Query all exercises from DB in one batch
  const { data: exercisesFromDb, error } = await supabase
    .from("exercise_library")
    .select("id, name_he")
    .in("name_he", Array.from(allExerciseNames));

  if (error) {
    throw new Error(`Failed to query exercise_library: ${error.message}`);
  }

  // Create a map: name_he -> id
  const exerciseMap = new Map<string, string>();
  if (exercisesFromDb) {
    for (const ex of exercisesFromDb) {
      exerciseMap.set(ex.name_he, ex.id);
    }
  }

  // Clone plan to avoid mutation
  const planWithIds: Plan = JSON.parse(JSON.stringify(plan));

  // Resolve IDs for each exercise
  for (const day of planWithIds.plan) {
    for (const exercise of day.exercises) {
      const resolvedId = exerciseMap.get(exercise.name_he);

      if (resolvedId) {
        exercise.id = resolvedId;
      } else {
        // Exercise not found in DB
        exercise.id = null;
        missing.push({
          dayOrder: day.order,
          dayName: day.day_name,
          exerciseName: exercise.name_he,
          exerciseOrder: exercise.order
        });
      }
    }
  }

  return { planWithIds, missing };
}
