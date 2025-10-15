/**
 * Server utilities for normalized program data
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface WorkoutWithExercises {
  id: string;
  day_number: number;
  title: string;
  notes: string | null;
  completed: boolean;
  exercises: Array<{
    id: string;
    order_index: number;
    name: string;
    sets: number | null;
    reps: string | null;
    rest_seconds: number | null;
    tempo: string | null;
  }>;
}

export interface ProgramWithWorkouts {
  program: {
    id: string;
    user_id: string;
    title: string;
    goal: string | null;
    days_estimate: number;
    start_date: string | null;
    created_at: string;
  };
  workouts: WorkoutWithExercises[];
  stats: {
    total: number;
    completed: number;
    progress: number; // 0-100
  };
  nextWorkout: WorkoutWithExercises | null;
}

/**
 * Get all programs with their workouts for a user
 */
export async function getUserProgramsWithWorkouts(
  userId: string
): Promise<ProgramWithWorkouts[]> {
  const supabase = await createServerSupabaseClient();

  // Fetch programs
  const { data: programs, error: programsError } = await supabase
    .from("programs")
    .select("id, user_id, title, goal, days_estimate, start_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (programsError) {
    console.error("[Programs] Error fetching programs:", programsError);
    throw programsError;
  }

  if (!programs || programs.length === 0) {
    return [];
  }

  // Fetch workouts and exercises for all programs
  const results: ProgramWithWorkouts[] = [];

  for (const program of programs) {
    const { data: workouts, error: workoutsError } = await supabase
      .from("workouts")
      .select(`
        id,
        day_number,
        title,
        notes,
        completed,
        workout_exercises (
          id,
          order_index,
          name,
          sets,
          reps,
          rest_seconds,
          tempo
        )
      `)
      .eq("program_id", program.id)
      .order("day_number", { ascending: true });

    if (workoutsError) {
      console.error(`[Programs] Error fetching workouts for ${program.id}:`, workoutsError);
      continue;
    }

    const typedWorkouts: WorkoutWithExercises[] = (workouts || []).map((w: any) => ({
      id: w.id,
      day_number: w.day_number,
      title: w.title,
      notes: w.notes,
      completed: w.completed,
      exercises: (w.workout_exercises || [])
        .sort((a: any, b: any) => a.order_index - b.order_index)
        .map((e: any) => ({
          id: e.id,
          order_index: e.order_index,
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          rest_seconds: e.rest_seconds,
          tempo: e.tempo,
        })),
    }));

    const completed = typedWorkouts.filter((w) => w.completed).length;
    const total = typedWorkouts.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const nextWorkout = typedWorkouts.find((w) => !w.completed) || null;

    results.push({
      program,
      workouts: typedWorkouts,
      stats: { total, completed, progress },
      nextWorkout,
    });
  }

  return results;
}

/**
 * Get a single program with workouts
 */
export async function getProgramWithWorkouts(
  programId: string
): Promise<ProgramWithWorkouts | null> {
  const supabase = await createServerSupabaseClient();

  const { data: program, error: programError } = await supabase
    .from("programs")
    .select("id, user_id, title, goal, days_estimate, start_date, created_at")
    .eq("id", programId)
    .single();

  if (programError || !program) {
    return null;
  }

  const { data: workouts } = await supabase
    .from("workouts")
    .select(`
      id,
      day_number,
      title,
      notes,
      completed,
      workout_exercises (
        id,
        order_index,
        name,
        sets,
        reps,
        rest_seconds,
        tempo
      )
    `)
    .eq("program_id", programId)
    .order("day_number", { ascending: true });

  const typedWorkouts: WorkoutWithExercises[] = (workouts || []).map((w: any) => ({
    id: w.id,
    day_number: w.day_number,
    title: w.title,
    notes: w.notes,
    completed: w.completed,
    exercises: (w.workout_exercises || [])
      .sort((a: any, b: any) => a.order_index - b.order_index)
      .map((e: any) => ({
        id: e.id,
        order_index: e.order_index,
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        rest_seconds: e.rest_seconds,
        tempo: e.tempo,
      })),
  }));

  const completed = typedWorkouts.filter((w) => w.completed).length;
  const total = typedWorkouts.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const nextWorkout = typedWorkouts.find((w) => !w.completed) || null;

  return {
    program,
    workouts: typedWorkouts,
    stats: { total, completed, progress },
    nextWorkout,
  };
}
