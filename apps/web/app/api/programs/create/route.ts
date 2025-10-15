/**
 * API Route: POST /api/programs/create
 * Creates a new program with normalized workout structure
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateProgramTitle } from "@/lib/db/workoutParser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExerciseInput {
  name: string;
  sets?: number | null;
  reps?: string | null;
  rest_seconds?: number | null;
  tempo?: string | null;
}

interface WorkoutInput {
  day_number: number;
  title: string;
  notes?: string | null;
  exercises: ExerciseInput[];
}

interface CreateProgramRequest {
  user_id: string;
  title?: string;
  goal?: "gain" | "loss" | "recomp";
  days_estimate?: number;
  start_date?: string | null;
  workouts: WorkoutInput[];
  nutrition_meta?: Record<string, any>;
}

interface CreateProgramResponse {
  success: boolean;
  programId?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CreateProgramResponse>> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CreateProgramRequest = await request.json();

    // Validate required fields
    if (!body.workouts || body.workouts.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one workout is required" },
        { status: 400 }
      );
    }

    // Ensure user_id matches authenticated user
    if (body.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "User ID mismatch" },
        { status: 403 }
      );
    }

    // Generate program ID (nanoid-style)
    const programId = generateProgramId();

    // Generate title if not provided
    const title = body.title || generateProgramTitle(body.goal);

    // Create program in a transaction-like flow
    const result = await createProgramWithWorkouts(supabase, {
      id: programId,
      user_id: body.user_id,
      title,
      goal: body.goal,
      days_estimate: body.days_estimate || body.workouts.length,
      start_date: body.start_date,
      workouts: body.workouts,
      nutrition_meta: body.nutrition_meta,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      programId: result.programId,
    });
  } catch (error) {
    console.error("[API] Error creating program:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * Create program with all related data
 */
async function createProgramWithWorkouts(
  supabase: any,
  data: {
    id: string;
    user_id: string;
    title: string;
    goal?: string;
    days_estimate: number;
    start_date?: string | null;
    workouts: WorkoutInput[];
    nutrition_meta?: Record<string, any>;
  }
): Promise<{ success: boolean; programId?: string; error?: string }> {
  try {
    // 1. Insert program
    const { error: programError } = await supabase.from("programs").insert({
      id: data.id,
      user_id: data.user_id,
      title: data.title,
      goal: data.goal || null,
      days_estimate: data.days_estimate,
      start_date: data.start_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Legacy fields set to null
      workout_plan_text: null,
      nutrition_plan_json: null,
    });

    if (programError) {
      console.error("[API] Program insert error:", programError);
      return { success: false, error: `Failed to create program: ${programError.message}` };
    }

    // 2. Insert workouts and exercises
    for (const workout of data.workouts) {
      // Insert workout
      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          program_id: data.id,
          day_number: workout.day_number,
          title: workout.title,
          notes: workout.notes || null,
          completed: false,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (workoutError) {
        console.error("[API] Workout insert error:", workoutError);
        return { success: false, error: `Failed to create workout: ${workoutError.message}` };
      }

      const workoutId = workoutData.id;

      // Insert exercises for this workout
      if (workout.exercises && workout.exercises.length > 0) {
        const exercisesData = workout.exercises.map((exercise, index) => ({
          workout_id: workoutId,
          order_index: index + 1,
          name: exercise.name,
          sets: exercise.sets || null,
          reps: exercise.reps || null,
          rest_seconds: exercise.rest_seconds || null,
          tempo: exercise.tempo || null,
          created_at: new Date().toISOString(),
        }));

        const { error: exercisesError } = await supabase
          .from("workout_exercises")
          .insert(exercisesData);

        if (exercisesError) {
          console.error("[API] Exercises insert error:", exercisesError);
          return {
            success: false,
            error: `Failed to create exercises: ${exercisesError.message}`,
          };
        }
      }
    }

    // 3. Insert nutrition plan if provided
    if (data.nutrition_meta && Object.keys(data.nutrition_meta).length > 0) {
      const { error: nutritionError } = await supabase.from("nutrition_plans").insert({
        program_id: data.id,
        meta: data.nutrition_meta,
        created_at: new Date().toISOString(),
      });

      if (nutritionError) {
        console.error("[API] Nutrition plan insert error:", nutritionError);
        // Don't fail the whole operation for nutrition plan
      }
    }

    return { success: true, programId: data.id };
  } catch (error) {
    console.error("[API] Transaction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate a unique program ID (similar to nanoid format)
 */
function generateProgramId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 24; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
