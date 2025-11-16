import { NextResponse } from "next/server";
import { WorkoutProgram } from "@/lib/schemas/workout";
import { workoutSystem, workoutUser } from "@/lib/prompts/workout";
import { generateJson } from "@/lib/ai";
import { WORKOUTS_ENABLED } from "@/lib/config";

export async function POST(req: Request) {
  // Feature flag: workouts disabled
  if (!WORKOUTS_ENABLED) {
    console.log("⚠️  Workout programs disabled");
    return NextResponse.json({
      ok: false,
      disabled: true,
      message: "Workout programs are currently disabled",
    });
  }

  if (process.env.USE_MOCK_WORKOUT === "1") {
    // Return mock workout plan
    const mockWorkout = {
      weeks: [
        {
          week: 1,
          days: [
            {
              day: 1,
              name: "חזה ותלת ראשי",
              exercises: [
                { name: "לחיצת חזה", sets: 3, reps: "10-12", rest_seconds: 60 },
                { name: "לחיצת כתפיים", sets: 3, reps: "10-12", rest_seconds: 60 },
                { name: "מקבילים", sets: 3, reps: "8-10", rest_seconds: 90 }
              ]
            },
            {
              day: 2,
              name: "גב ודו ראשי",
              exercises: [
                { name: "מתח", sets: 3, reps: "8-10", rest_seconds: 90 },
                { name: "חתירה בכבל", sets: 3, reps: "10-12", rest_seconds: 60 },
                { name: "כפיפות מרפק", sets: 3, reps: "10-12", rest_seconds: 60 }
              ]
            },
            {
              day: 3,
              name: "רגליים",
              exercises: [
                { name: "סקוואט", sets: 3, reps: "10-12", rest_seconds: 90 },
                { name: "מכונת רגליים", sets: 3, reps: "12-15", rest_seconds: 60 },
                { name: "עליות על בהונות", sets: 3, reps: "15-20", rest_seconds: 45 }
              ]
            }
          ]
        }
      ]
    };
    return NextResponse.json({ ok: true, plan: mockWorkout, warnings: [] });
  }

  const body = await req.json();

  try {
    const plan = await generateJson({
      system: workoutSystem,
      user: workoutUser({
        genderHe: body.gender,
        age: body.age,
        heightCm: body.heightCm,
        weightKg: body.weight,
        goalToken: body.goal || "muscle_gain",
        experienceToken: body.experienceLevel || "intermediate",
        workoutsPerWeek: body.workoutsPerWeek || 3,
        equipment: body.equipment || [],
        notes: body.notes || "",
      }),
      model: process.env.OPENAI_MODEL_WORKOUT || "gpt-4o-mini",
      schema: WorkoutProgram,
    });

    return NextResponse.json({ ok: true, plan, warnings: [] });
  } catch (err: any) {
    console.error("[Workout API]", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
