import { NextRequest, NextResponse } from "next/server";
import { generateNutritionPlan, NutritionPayloadSchema } from "@/lib/server/nutrition/generate";
import { checkRateLimit, ErrorResponses, handleApiError } from "@/lib/api/security";
import { logger, sanitizeRequestBody } from "@/lib/logger";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * POST /api/ai/nutrition/onboarding
 *
 * Generate a nutrition plan during onboarding (unauthenticated)
 * This endpoint is called by the onboarding flow BEFORE user signup
 *
 * Accepts English enum values directly from mobile app:
 * - gender: "male" | "female" | "other"
 * - activity: "sedentary" | "light" | "moderate" | "high"
 * - goal: "loss" | "gain" | "recomp" | "maintain"
 * - diet: "none" | "vegan" | "vegetarian" | "keto" | "paleo" | "low_carb" | "mediterranean"
 *
 * Requirements:
 * - All profile fields must be provided
 * - days parameter is forced to 1
 * - Stricter rate limiting since unauthenticated
 *
 * Returns:
 * - 200: Plan generated successfully
 * - 422: Invalid input or generation failed
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    logger.info('Onboarding nutrition generation request received', {
      endpoint: '/api/ai/nutrition/onboarding',
    });

    // Stricter rate limiting for unauthenticated requests (3 per minute per IP)
    const rateLimit = await checkRateLimit(req, {
      maxRequests: 3,
      windowMs: 60 * 1000, // 60 seconds in milliseconds
      keyPrefix: 'ai-nutrition-onboarding',
    });

    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded for onboarding nutrition', {
        endpoint: '/api/ai/nutrition/onboarding',
        limit: rateLimit.limit,
      });
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    const rawBody = await req.json();

    // Hard clamp: force days to 1 before validation (ignore any input)
    const bodyWithForcedDays = { ...rawBody, days: 1 };

    logger.debug('Onboarding nutrition request payload (English enums)', {
      payload: sanitizeRequestBody(bodyWithForcedDays),
    });

    // Validate English payload directly - no conversion needed
    const validationResult = NutritionPayloadSchema.safeParse(bodyWithForcedDays);

    if (!validationResult.success) {
      logger.warn('Onboarding nutrition invalid input', {
        errors: validationResult.error.flatten().fieldErrors,
      });
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

    logger.info('Starting onboarding nutrition generation', {
      model,
      days: payload.days,
      gender: payload.gender,
      goal: payload.goal,
      diet: payload.diet,
    });

    // Generate nutrition plan using shared utility with verbose logging
    const result = await generateNutritionPlan(payload, {
      logPrefix: '[AI][Nutrition][Onboarding]',
      enableVerboseLogging: true,
    });

    logger.info('Onboarding nutrition generation successful', {
      calories: result.calories,
      protein_g: result.plan.dailyTargets?.protein_g,
      daysGenerated: result.plan.days?.length || 0,
      fingerprint: result.fingerprint.substring(0, 12),
    });

    return NextResponse.json(
      {
        ok: true,
        plan: result.plan,
        calories: result.calories,
        fingerprint: result.fingerprint
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    logger.error("Onboarding nutrition generation failed", {
      endpoint: '/api/ai/nutrition/onboarding',
      errorName: err?.name,
      errorMessage: err?.message,
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
      logger.error('OpenAI API error in onboarding nutrition generation', {
        endpoint: '/api/ai/nutrition/onboarding',
        errorName: err?.name,
        errorMessage: err?.message,
      });
      return NextResponse.json(
        {
          ok: false,
          error: "AIServiceError",
          message: "AI service temporarily unavailable",
        },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    // Handle generation errors
    if (err?.message?.includes("Diet violation") || err?.message?.includes("Failed to generate")) {
      return NextResponse.json(
        {
          ok: false,
          error: "GenerationError",
          message: "Failed to generate valid nutrition plan",
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
        },
        { status: 504, headers: NO_CACHE_HEADERS }
      );
    }

    // Use standardized error handler for unknown errors
    return handleApiError(err, 'AI-Nutrition-Onboarding');
  }
}
