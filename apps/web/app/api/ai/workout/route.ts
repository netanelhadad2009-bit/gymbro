import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { WorkoutProgram } from "@/lib/schemas/workout";
import { workoutSystem, workoutUser } from "@/lib/prompts/workout";
import { generateJson } from "@/lib/ai";
import { WORKOUTS_ENABLED } from "@/lib/config";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

// Input validation schema
const WorkoutRequestSchema = z.object({
  gender: z.string().min(1).max(50),
  age: z.number().int().min(13).max(120),
  heightCm: z.number().positive().max(300),
  weight: z.number().positive().max(500),
  goal: z.string().optional(),
  experienceLevel: z.enum(["beginner", "intermediate", "advanced"]).optional(),
  workoutsPerWeek: z.number().int().min(1).max(7).optional(),
  equipment: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  // Feature flag: workouts disabled
  if (!WORKOUTS_ENABLED) {
    console.log("⚠️  Workout programs disabled");
    return NextResponse.json({
      ok: false,
      disabled: true,
      message: "Workout programs are currently disabled",
    });
  }

  try {
    // Rate limiting check (5 requests per minute for AI routes)
    const rateLimit = await checkRateLimit(req, {
      ...RateLimitPresets.ai,
      keyPrefix: 'ai-workout',
    });

    if (!rateLimit.allowed) {
      console.log('[AI][Workout] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      console.log('[AI][Workout] Authentication failed');
      return auth.response;
    }
    const { user } = auth;
    console.log('[AI][Workout] Authenticated user:', user.id);

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

    // Validate request body
    const validation = await validateBody(req, WorkoutRequestSchema);
    if (!validation.success) {
      return validation.response;
    }
    const body = validation.data;
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

    console.log('[AI][Workout] Generation successful');
    return NextResponse.json({ ok: true, plan, warnings: [] });
  } catch (err: any) {
    console.error("[AI][Workout] Error:", err);

    // Handle OpenAI/AI errors specifically
    if (err?.name === 'APIError' || err?.message?.includes('OpenAI')) {
      console.error('[AI][Workout] OpenAI API error:', err);
      return NextResponse.json(
        {
          ok: false,
          error: "AIServiceError",
          message: "AI service temporarily unavailable",
        },
        { status: 503 }
      );
    }

    // Use standardized error handler for unknown errors
    return handleApiError(err, 'AI-Workout');
  }
}
