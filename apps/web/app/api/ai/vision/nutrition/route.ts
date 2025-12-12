import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LOG_MEALS = process.env.NEXT_PUBLIC_LOG_AIMEALS === "1";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Compute a health score 0..100 using simple heuristics.
 * Inputs are per serving; we normalize by calories to avoid portion bias.
 */
function computeHealthScore({
  calories = 0,
  protein = 0,
  carbs = 0,
  fat = 0,
}: {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}): number {
  // Avoid division by zero
  if (calories === 0) return 50;

  // Normalize macros per 100 kcal to compare fairly across foods
  const norm = (x: number) => (x / calories) * 100;

  const proteinNorm = norm(protein * 4); // protein has 4 kcal/g
  const carbsNorm = norm(carbs * 4);     // carbs have 4 kcal/g
  const fatNorm = norm(fat * 9);         // fat has 9 kcal/g

  // Weighted components (simple, explainable)
  // Higher protein is better (up to a point)
  const proteinScore = Math.min(proteinNorm / 40, 1.0) * 0.40; // ~40% of calories from protein ≈ max

  // Lower fat is generally better (but not zero)
  const fatPenalty = Math.max(0, (fatNorm - 30) / 70) * 0.30; // penalize if >30% from fat

  // Carbs are neutral - we don't have sugar data yet
  const carbsScore = 0.15; // neutral contribution

  // Calorie density matters too - very high calorie foods get slight penalty
  const calorieDensityPenalty = calories > 600 ? 0.10 : 0;

  // Final score: start at 50, add positives, subtract negatives
  const raw = 0.5 + proteinScore + carbsScore - fatPenalty - calorieDensityPenalty;

  // Clamp to 0..1 and convert to 0..100
  return Math.round(clamp01(raw) * 100);
}

const PROMPT = `
Analyze the food in this image and respond ONLY with strict JSON.
IMPORTANT: You MUST include ALL fields in your response.

Response format:
{
  "meal_name": "string (REQUIRED - in English)",
  "calories": number (REQUIRED),
  "protein": number (REQUIRED - in grams),
  "carbs": number (REQUIRED - in grams),
  "fat": number (REQUIRED - in grams),
  "confidence": number (REQUIRED - 0-100),
  "health_score": number (REQUIRED - 0-100)
}

Field requirements:
- meal_name: MUST be in English
- calories: Total calories for the portion shown
- protein: Grams of protein
- carbs: Grams of carbohydrates
- fat: Grams of fat
- confidence: 0-100 representing how confident you are in this analysis
- health_score: REQUIRED field 0-100 rating how healthy this food is:
  * 80-100: Very healthy (whole foods, vegetables, lean proteins, minimal processing)
  * 60-79: Moderately healthy (balanced meal with some processed ingredients)
  * 40-59: Neutral (mixed healthy and unhealthy elements)
  * 20-39: Less healthy (high in sugar, saturated fat, or heavily processed)
  * 0-19: Unhealthy (fast food, deep fried, very high sugar/fat content)

CRITICAL: Always include health_score in your response. Never omit it.
No prose, no markdown, only JSON.
`;

function toBuffer(arrayBuffer: ArrayBuffer) {
  return Buffer.from(new Uint8Array(arrayBuffer));
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check (10 requests per minute for vision API)
    const rateLimit = await checkRateLimit(req, {
      maxRequests: 10,
      windowMs: 60 * 1000,
      keyPrefix: 'ai-vision-nutrition',
    });

    if (!rateLimit.allowed) {
      if (LOG_MEALS) console.log("[VISION] Rate limit exceeded");
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check using standardized helper
    const auth = await requireAuth();
    if (!auth.success) {
      if (LOG_MEALS) console.log("[VISION] Authentication failed");
      return auth.response;
    }
    const { user, supabase } = auth;

    if (LOG_MEALS) {
      console.log("[VISION] Authenticated user:", { userId: user.id });
    }

    // D. Get the uploaded file
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, code: "missing_file" },
        { status: 400 }
      );
    }

    // E. Call OpenAI Vision API
    const bytes = await file.arrayBuffer();
    const b64 = Buffer.from(bytes).toString("base64");
    const mime = file.type || "image/jpeg";

    if (LOG_MEALS) {
      console.log("[VISION] Analyzing image:", {
        fileSize: bytes.byteLength,
        mimeType: mime,
      });
    }

    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o";

    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${b64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { ok: false, code: "no_ai_response" },
        { status: 422 }
      );
    }

    // F. Parse AI response
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error("[VISION] Failed to parse AI response:", content);
      return NextResponse.json(
        { ok: false, code: "invalid_ai_response" },
        { status: 422 }
      );
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        { ok: false, code: "invalid_ai_response" },
        { status: 422 }
      );
    }

    // G. Validate and build payload
    const meal_name = String(parsed.meal_name || "Meal");
    const calories = Math.max(0, Math.min(9999, Math.round(Number(parsed.calories || 0))));
    const protein = Math.max(0, Math.min(9999, Math.round(Number(parsed.protein || 0))));
    const carbs = Math.max(0, Math.min(9999, Math.round(Number(parsed.carbs || 0))));
    const fat = Math.max(0, Math.min(9999, Math.round(Number(parsed.fat || 0))));
    const confidence = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence || 80))));

    // Compute health score dynamically from macros
    // Prefer AI's score if valid, otherwise compute from macros
    let health_score: number;
    const aiProvidedScore = parsed.health_score;
    if (parsed.health_score && Number(parsed.health_score) > 0) {
      health_score = Math.max(0, Math.min(100, Math.round(Number(parsed.health_score))));
      console.log("[VISION] Using AI health_score:", { aiScore: aiProvidedScore, final: health_score });
    } else {
      health_score = computeHealthScore({ calories, protein, carbs, fat });
      console.log("[VISION] Computed health_score from macros:", {
        calories, protein, carbs, fat,
        computed: health_score,
        aiProvidedScore
      });
    }

    if (calories === 0) {
      return NextResponse.json(
        { ok: false, code: "no_detection" },
        { status: 422 }
      );
    }

    console.log("[VISION] Final analysis result:", {
      meal_name,
      calories,
      protein,
      carbs,
      fat,
      confidence,
      health_score,
    });

    // H. Upload image to Supabase Storage (optional, for preview)
    const fileName = `${user.id}/${Date.now()}-${file.name || "meal"}.jpg`;

    let publicUrl: string | null = null;

    try {
      const { data: storageRes, error: storageErr } = await supabase.storage
        .from("meal-images")
        .upload(fileName, toBuffer(bytes), {
          contentType: mime,
          upsert: false,
        });

      if (storageErr) {
        if (LOG_MEALS) {
          console.error("[VISION] Storage error:", {
            stage: "upload",
            error: {
              message: storageErr.message,
              statusCode: (storageErr as any).statusCode,
            },
          });
        }
        // Continue without image URL if storage fails
        console.warn("[VISION] Image upload failed, continuing without image");
      } else if (storageRes) {
        const { data: pub } = supabase.storage
          .from("meal-images")
          .getPublicUrl(storageRes.path);
        publicUrl = pub?.publicUrl ?? null;

        if (LOG_MEALS) {
          console.log("[VISION] Image uploaded:", { path: storageRes.path });
        }
      }
    } catch (storageError: any) {
      console.error("[VISION] Storage exception:", storageError);
      // Continue without image URL
    }

    // Extract ingredients if provided
    const ingredients = Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map((i: any) => String(i)).filter(Boolean)
      : undefined;

    if (LOG_MEALS) {
      console.log("[VISION] ✅ Analysis complete - NOT inserting to DB (review flow)");
    }

    // Return analysis WITHOUT inserting into database
    // The client will route to review page, and user can add from there
    return NextResponse.json({
      ok: true,
      meal: {
        name: meal_name,
        calories,
        protein,
        carbs,
        fat,
        confidence,
        health_score,
        ingredients,
        image_url: publicUrl,
      },
    });
  } catch (err: any) {
    console.error("[VISION] Unexpected error:", {
      message: err?.message,
      stack: err?.stack,
    });

    // Handle OpenAI/AI errors specifically
    if (err?.name === 'APIError' || err?.message?.includes('OpenAI')) {
      console.error('[VISION] OpenAI API error:', err);
      return NextResponse.json(
        {
          ok: false,
          code: "ai_service_error",
          message: "AI service temporarily unavailable",
        },
        { status: 503 }
      );
    }

    // Use standardized error handler for unknown errors
    return handleApiError(err, 'AI-Vision-Nutrition');
  }
}
