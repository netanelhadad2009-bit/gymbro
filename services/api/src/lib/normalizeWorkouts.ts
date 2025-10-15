/**
 * Helper to insert normalized workout data into database
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { createId } from "@paralleldrive/cuid2";

interface Exercise {
  exercise_id?: string;
  name?: string;
  name_he?: string;
  sets?: number;
  reps?: string;
  rest_seconds?: number;
  tempo?: string;
}

interface WorkoutDay {
  day?: number;
  day_number?: number;
  order?: number;
  title?: string;
  day_name?: string;
  exercises: Exercise[];
  notes?: string;
}

interface WorkoutPlan {
  plan: WorkoutDay[];
}

/**
 * Parse workout text (JSON) and insert into normalized tables
 * @param supabase Supabase client
 * @param programId Program ID from programs table
 * @param workoutText JSON string from /ai/workout endpoint
 * @returns True if successful
 */
export async function insertNormalizedWorkouts(
  supabase: SupabaseClient,
  programId: string,
  workoutText: string
): Promise<boolean> {
  try {
    // Parse the workout JSON
    const workoutPlan: WorkoutPlan = JSON.parse(workoutText);

    if (!workoutPlan.plan || !Array.isArray(workoutPlan.plan)) {
      console.error("[normalizeWorkouts] Invalid workout plan structure");
      return false;
    }

    // Debug log to see the actual structure
    if (workoutPlan.plan.length > 0) {
      console.log("[normalizeWorkouts] First workout day structure:", JSON.stringify(workoutPlan.plan[0], null, 2));
    }

    console.log(`[normalizeWorkouts] Inserting ${workoutPlan.plan.length} workouts for program ${programId}`);

    // Delete existing workouts for this program (in case of update)
    const { error: deleteError } = await supabase
      .from("workouts")
      .delete()
      .eq("program_id", programId);

    if (deleteError) {
      console.error("[normalizeWorkouts] Error deleting existing workouts:", deleteError);
      // Continue anyway - might be first insert
    }

    // Insert each workout day
    for (let i = 0; i < workoutPlan.plan.length; i++) {
      const day = workoutPlan.plan[i];
      const dayNumber = day.order || day.day || day.day_number || (i + 1);
      const dayTitle = day.day_name || day.title || `יום ${dayNumber}`;

      // Insert workout and get the generated UUID
      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          program_id: programId,
          day_number: dayNumber,
          title: dayTitle,
          notes: day.notes || null,
          completed: false
        })
        .select()
        .single();

      if (workoutError || !workoutData) {
        console.error(`[normalizeWorkouts] Error inserting workout day ${dayNumber}:`, workoutError);
        return false;
      }

      const workoutId = workoutData.id;

      // Insert exercises for this workout
      if (day.exercises && Array.isArray(day.exercises)) {
        const exercisesData = day.exercises.map((exercise, index) => ({
          workout_id: workoutId,
          order_index: index + 1,
          name: exercise.name_he || exercise.name || 'תרגיל',
          sets: exercise.sets || null,
          reps: exercise.reps || null,
          rest_seconds: exercise.rest_seconds || null,
          tempo: exercise.tempo || null
        }));

        const { error: exercisesError } = await supabase
          .from("workout_exercises")
          .insert(exercisesData);

        if (exercisesError) {
          console.error(`[normalizeWorkouts] Error inserting exercises for day ${dayNumber}:`, exercisesError);
          return false;
        }

        console.log(`[normalizeWorkouts] Inserted workout day ${dayNumber} with ${day.exercises.length} exercises`);
      }
    }

    console.log(`[normalizeWorkouts] ✅ Successfully inserted ${workoutPlan.plan.length} normalized workouts`);
    return true;
  } catch (err: any) {
    console.error("[normalizeWorkouts] Error:", err.message);
    return false;
  }
}
