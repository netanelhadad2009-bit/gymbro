import { NextResponse } from "next/server";
import { generateNutritionPlan, NutritionPayloadSchema } from "@/lib/server/nutrition/generate";
import { chaosMode } from "@/lib/chaos";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * POST /api/ai/nutrition
 *
 * Generate a nutrition plan using AI
 * This endpoint is called by the onboarding flow
 *
 * Requirements:
 * - All profile fields must be provided
 * - days parameter is forced to 1
 *
 * Returns:
 * - 200: Plan generated successfully
 * - 422: Invalid input or generation failed
 * - 500: Server error
 */
export async function POST(req: Request) {
  try {
    console.log('[AI][Nutrition] POST request received');

    // Chaos injection: Check for chaos query param
    const url = new URL(req.url);
    const chaosFlag = url.searchParams.get('chaos');

    // Chaos: stall (to trigger timeout)
    if (chaosFlag === 'stall') {
      console.log('[Chaos][Nutrition] Stalling request...');
      await chaosMode.stall(70_000);
    }

    const rawBody = await req.json();

    // Hard clamp: force days to 1 before validation (ignore any input)
    const bodyWithForcedDays = { ...rawBody, days: 1 };

    console.log('[AI][Nutrition] Request payload', {
      gender_he: bodyWithForcedDays.gender_he,
      age: bodyWithForcedDays.age,
      height_cm: bodyWithForcedDays.height_cm,
      weight_kg: bodyWithForcedDays.weight_kg,
      activity_level_he: bodyWithForcedDays.activity_level_he,
      goal_he: bodyWithForcedDays.goal_he,
      diet_type_he: bodyWithForcedDays.diet_type_he,
      days: bodyWithForcedDays.days,
    });

    // Strict validation - return 422 on invalid input
    const validationResult = NutritionPayloadSchema.safeParse(bodyWithForcedDays);

    if (!validationResult.success) {
      console.error("[AI][Nutrition] Invalid input", validationResult.error.flatten());
      return NextResponse.json(
        {
          ok: false,
          error: "InvalidInput",
          message: "Missing or invalid required fields",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 422, headers: NO_CACHE_HEADERS }
      );
    }

    const payload = validationResult.data;
    const model = process.env.OPENAI_MODEL_NUTRITION || "gpt-4o-mini";

    console.log('[AI][Nutrition] Starting generation', {
      model,
      days: payload.days,
    });

    // Generate nutrition plan using shared utility with VERBOSE LOGGING ALWAYS ENABLED
    const result = await generateNutritionPlan(payload, {
      logPrefix: '[AI][Nutrition]',
      enableVerboseLogging: true, // Always enable verbose logging for diagnostics
    });

    console.log('[AI][Nutrition] Generation successful', {
      calories: result.calories,
      protein_g: result.plan.dailyTargets?.protein_g,
      daysGenerated: result.plan.days?.length || 0,
      fingerprint: result.fingerprint.substring(0, 12),
    });

    // Chaos: malformed response
    const responseData = { ok: true, plan: result.plan, calories: result.calories, fingerprint: result.fingerprint };
    const finalData = chaosMode.maybeCorruptPayload(responseData, chaosFlag ?? undefined);

    return NextResponse.json(finalData, { headers: NO_CACHE_HEADERS });
  } catch (err: any) {
    console.error("[AI][Nutrition] Generation failed:", {
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
      cause: err?.cause,
    });

    // Handle validation errors
    if (err?.name === "ZodError") {
      return NextResponse.json(
        {
          ok: false,
          error: "InvalidInput",
          message: "Missing or invalid required fields",
          details: err.flatten().fieldErrors,
        },
        { status: 422, headers: NO_CACHE_HEADERS }
      );
    }

    // Handle OpenAI API errors
    if (err?.name === 'APIError' || err?.message?.includes('OpenAI')) {
      return NextResponse.json(
        {
          ok: false,
          error: "OpenAIError",
          message: err?.message || "OpenAI API request failed",
          details: err?.message ?? "Unknown OpenAI error",
        },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Handle generation errors
    if (err?.message?.includes("Diet violation") || err?.message?.includes("Failed to generate")) {
      return NextResponse.json(
        {
          ok: false,
          error: "GenerationError",
          message: err?.message || "Failed to generate valid nutrition plan",
          details: err?.message ?? "Unknown error",
        },
        { status: 422, headers: NO_CACHE_HEADERS }
      );
    }

    // Handle timeout errors
    if (err?.name === 'AbortError') {
      return NextResponse.json(
        {
          ok: false,
          error: "TimeoutError",
          message: "Generation timed out",
          details: err?.message ?? "Request timed out",
        },
        { status: 504, headers: NO_CACHE_HEADERS }
      );
    }

    // Generic server error
    return NextResponse.json(
      {
        ok: false,
        error: err?.name || "ServerError",
        message: err?.message || "Internal server error",
        details: err?.message ?? "Unknown error",
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
