/**
 * Plan generation routes
 *
 * curl examples:
 *
 * 1. POST /ai/days
 *    curl -X POST http://localhost:3001/ai/days \
 *      -H "Content-Type: application/json" \
 *      -d '{"gender":"male","age":28,"weight":92,"targetWeight":78,"heightCm":178,"goal":"loss","activityLevel":"intermediate"}'
 *
 * 2. POST /ai/workout (V2 - JSON output)
 *    curl -X POST http://localhost:3001/ai/workout \
 *      -H "Content-Type: application/json" \
 *      -d '{"userId":"user123","gender":"male","age":28,"weight":92,"targetWeight":78,"heightCm":178,"activityLevel":"intermediate","experienceLevel":"intermediate","goal":"שריפת שומן","workoutsPerWeek":5,"equipment":["משקולות חופשיות","מכונות"]}'
 *
 * 3. POST /ai/nutrition
 *    curl -X POST http://localhost:3001/ai/nutrition \
 *      -H "Content-Type: application/json" \
 *      -d '{"gender":"זכר","age":28,"heightCm":178,"weight":92,"targetWeight":78,"activityDisplay":"בינוני","goalDisplay":"שריפת שומן","startDateISO":"2025-10-09"}'
 *
 * 4. POST /ai/commit
 *    curl -X POST http://localhost:3001/ai/commit \
 *      -H "Content-Type: application/json" \
 *      -d '{"userId":"user123","days":90,"workoutText":"יום 1...","nutritionJson":{"meta":{...},"meals_flat":[...]}}'
 *
 * 5. GET /ai/program/:userId
 *    curl http://localhost:3001/ai/program/user123
 */

import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { createId } from "@paralleldrive/cuid2";
import { calcDaysToGoal, type DaysEstimateParams } from "../lib/days";
import { NutritionPlanSchema } from "../schemas/nutrition";
import { supabaseService } from "../lib/supabase";
import { withTimeout } from "../lib/withTimeout";
import { validatePlanOrThrow } from "../ai/validatePlan";
import { resolveExerciseIds } from "../ai/resolveExerciseIds";
import { normalizePlan } from "../ai/normalizePlan";
import { insertNormalizedWorkouts } from "../lib/normalizeWorkouts";

export const planRouter = Router();

// Initialize Anthropic client (for nutrition)
const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (!anthropicKey) {
  console.error("❌ FATAL: Missing ANTHROPIC_API_KEY in environment variables!");
  process.exit(1);
}
const anthropic = new Anthropic({ apiKey: anthropicKey });

// Initialize OpenAI client (for workouts)
const openaiKey = process.env.OPENAI_API_KEY;
if (!openaiKey) {
  console.error("❌ FATAL: Missing OPENAI_API_KEY in environment variables!");
  process.exit(1);
}
const openai = new OpenAI({ apiKey: openaiKey });

// Model to use for all LLM operations
const MODEL = "claude-3-5-haiku-20241022"; // Nutrition
const WORKOUT_MODEL = "gpt-4o"; // Workouts - GPT-4o is fast and reliable (~5-12s)

// Environment configuration
const SOFT_VALIDATE = process.env.WORKOUT_SOFT_VALIDATE !== 'false';

console.log("✓ Plan router initialized");
console.log("  📦 Nutrition model:", MODEL);
console.log("  🏋️  Workout model:", WORKOUT_MODEL);
console.log("  🔧 Validation mode:", SOFT_VALIDATE ? 'SOFT (auto-correct)' : 'HARD (strict)');

// ==================== VALIDATION SCHEMAS ====================

const DaysBodySchema = z.object({
  gender: z.enum(["male", "female"]),
  age: z.number().int().positive(),
  weight: z.number().positive(),
  targetWeight: z.number().positive(),
  heightCm: z.number().positive(),
  goal: z.enum(["loss", "gain", "muscle", "maintain"]),
  activityLevel: z.enum(["beginner", "intermediate", "advanced"])
});

const WorkoutBodySchema = z.object({
  userId: z.string().min(1),
  gender: z.enum(["male", "female"]),
  age: z.number().int().positive(),
  weight: z.number().positive(),
  targetWeight: z.number().positive(),
  heightCm: z.number().positive(),
  activityLevel: z.enum(["beginner", "intermediate", "advanced"]),
  experienceLevel: z.string(),
  goal: z.string(),
  workoutsPerWeek: z.number().int().min(2).max(7),
  equipment: z.array(z.string()).optional().default(["משקולות חופשיות", "מכונות", "משקל גוף"])
});

const NutritionBodySchema = z.object({
  gender: z.string(),
  age: z.number().int().positive(),
  heightCm: z.number().positive(),
  weight: z.number().positive(),
  targetWeight: z.number().positive(),
  activityDisplay: z.string(),
  goalDisplay: z.string(),
  startDateISO: z.string()
});

const CommitBodySchema = z.object({
  userId: z.string().min(1),
  days: z.number().int().positive(),
  workoutText: z.string().min(10),
  nutritionJson: z.any()
});

// ==================== ROUTES ====================

/**
 * POST /ai/days - Calculate days to goal (deterministic, no LLM)
 */
planRouter.post("/days", async (req, res) => {
  try {
    console.log("[/ai/days] Request:", { ...req.body, weight: "***", targetWeight: "***" });

    const parsed = DaysBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_input", details: parsed.error.issues });
    }

    const params: DaysEstimateParams = parsed.data;
    const days = calcDaysToGoal(params);

    console.log("[/ai/days] Calculated days:", days);
    return res.json({ ok: true, days });
  } catch (err: any) {
    console.error("[/ai/days] Error:", err.message);
    return res.status(500).json({ ok: false, error: "calculation_failed", details: err?.message });
  }
});

/**
 * POST /ai/workout - Generate Hebrew workout plan via Claude
 */
planRouter.post("/workout", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("[/ai/workout] 📥 Request payload summary:", {
      userId: req.body.userId,
      gender: req.body.gender,
      workoutsPerWeek: req.body.workoutsPerWeek,
      goal: req.body.goal,
      experienceLevel: req.body.experienceLevel
    });

    const parsed = WorkoutBodySchema.safeParse(req.body);
    if (!parsed.success) {
      console.error("[/ai/workout] ❌ Input validation failed:", parsed.error.issues);
      return res.status(400).json({
        ok: false,
        error_code: "INVALID_INPUT",
        message: "Request body validation failed",
        issues: parsed.error.issues
      });
    }

    const params = parsed.data;

    // Gender × frequency day-split mapping
    const daySplits: Record<string, Record<number, string>> = {
      male: {
        2: "Full Body, Full Body",
        3: "Upper Body, Lower Body, Full Body",
        4: "Push, Pull, Legs, Core/Cardio",
        5: "Chest/Triceps, Back/Biceps, Legs, Shoulders/Abs, Full Body",
        6: "Push, Pull, Legs, Push, Pull, Legs",
        7: "Chest, Back, Legs, Shoulders, Arms, Core, Full Body"
      },
      female: {
        2: "Full Body, Full Body",
        3: "Upper Body, Lower Body, Full Body",
        4: "Upper Body, Lower Body, Full Body, Core/Cardio",
        5: "Chest/Back, Legs, Shoulders/Arms, Lower Body, Full Body",
        6: "Upper Body, Lower Body, Full Body, Upper Body, Lower Body, Core",
        7: "Chest, Back, Legs, Shoulders, Arms, Lower Body, Full Body"
      }
    };

    const split = daySplits[params.gender]?.[params.workoutsPerWeek] || "Full Body";

    // Map Hebrew goal to English enum
    const goalMapping: Record<string, "mass" | "cut" | "strength"> = {
      "שריפת שומן": "cut",
      "חיטוב": "cut",
      "הגדלת מסה": "mass",
      "מסה": "mass",
      "כוח": "strength",
      "עוצמה": "strength"
    };

    const normalizedGoal = goalMapping[params.goal.trim()] || "cut";

    // V2 System prompt - Strict JSON-based structured output
    const systemPrompt = `אתה מאמן כושר מקצועי. החזר JSON בלבד (ללא טקסט חופשי) בהתאם לסכימה:
{
  "user_id": string,
  "goal": "mass" | "cut" | "strength",
  "days_per_week": number (2-7),
  "plan": [
    {
      "day_name": string,
      "order": number (1..N),
      "muscles_focus": string[] (1-5 פריטים),
      "exercises": [
        {
          "name_he": string,
          "sets": number (2-4),
          "reps": string (טווח עם '-', לדוגמה "8-12"),
          "rest_seconds": number (30-240),
          "tempo": string ("2-0-2" בלבד או "החזק"),
          "target_muscles": string[] (1-4),
          "order": number (1..M)
        }
      ],
      "total_sets": number (סכום הסטים של כל התרגילים ≤ 25)
    }
  ]
}
כל תרגיל: 2-4 סטים; **לפחות 6 תרגילים ביום** (עד 10); ≤25 סטים ביום.
טמפו: רק "2-0-2" או "החזק".
לפי המטרה:
- mass: רוב החזרות "8-12"
- cut: רוב החזרות "12-15"
- strength: רוב החזרות "5-8"
שרירי ליבה/בטן יכולים להיות "15-20" או "החזק".
פלט JSON תקין בלבד — ללא טקסט נוסף.`;

    // V2 User prompt - comprehensive with explicit goal enum mapping
    const userPrompt = `צור תוכנית אימונים מותאמת אישית למשתמש הבא:

🧍‍♂️ פרופיל:
- מזהה משתמש: ${params.userId}
- מגדר: ${params.gender === "male" ? "זכר" : "נקבה"}
- גיל: ${params.age}
- משקל נוכחי: ${params.weight} ק"ג
- יעד משקל: ${params.targetWeight} ק"ג
- גובה: ${params.heightCm} ס"מ
- רמת ניסיון: ${params.experienceLevel}
- מטרה: ${params.goal}
- **goal enum: "${normalizedGoal}"** (השתמש בדיוק בערך זה בשדה goal ב-JSON)
- מספר אימונים בשבוע: ${params.workoutsPerWeek}
- סוג ציוד זמין: ${params.equipment.join(", ")}

🏋️ חלוקת ימים מוצעת:
${split}

⚠️ חשוב מאוד:
- goal חייב להיות "${normalizedGoal}" (בדיוק כך)
- muscles_focus חייב לכלול 1–5 פריטים לכל יום
- tempo רק '2-0-2' או 'החזק' (שום דבר אחר)
- reps חייב להיות טווח עם מקף '-' (לדוגמה "8-12")

החזר JSON תקני בלבד לפי ההנחיות.`;

    // Call OpenAI GPT-4o Mini with timeout
    console.log("[/ai/workout] 🤖 Calling LLM with model:", WORKOUT_MODEL);
    const llmStartTime = Date.now();

    const completion = await withTimeout(
      openai.chat.completions.create({
        model: WORKOUT_MODEL,
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      60000 // 60 second timeout for gpt-4o
    );

    const llmElapsed = Date.now() - llmStartTime;
    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;

    console.log("[/ai/workout] ✅ LLM response received", {
      elapsed_ms: llmElapsed,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens
    });

    let responseText = completion.choices[0]?.message?.content || "";

    if (!responseText || responseText.trim().length < 50) {
      console.error("[/ai/workout] ❌ Empty or too short response from LLM");
      return res.status(500).json({
        ok: false,
        error_code: "EMPTY_RESPONSE",
        message: "LLM returned empty or invalid response"
      });
    }

    // Clean markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Parse JSON
    let rawPlan: any;
    try {
      rawPlan = JSON.parse(responseText);
      console.log("[/ai/workout] ✅ JSON parsed successfully");
    } catch (parseErr: any) {
      console.error("[/ai/workout] ❌ JSON parse error:", parseErr.message);
      console.error("[/ai/workout] Raw response (first 500 chars):", responseText.substring(0, 500));
      return res.status(500).json({
        ok: false,
        error_code: "INVALID_JSON",
        message: "Failed to parse workout plan JSON from LLM response"
      });
    }

    // FIRST PASS: Normalize + Validate
    console.log("[/ai/workout] 🔧 Normalizing plan...");
    const normalizationResult = normalizePlan(rawPlan, {
      goal: params.goal,
      workoutsPerWeek: params.workoutsPerWeek
    });

    if (normalizationResult.warnings.length > 0) {
      console.log("[/ai/workout] ⚠️  Normalization warnings:", normalizationResult.warnings.slice(0, 5));
    }

    let validationResult;
    let finalPlan = normalizationResult.plan;

    try {
      validationResult = validatePlanOrThrow(finalPlan, {
        goal: normalizedGoal,
        daysPerWeek: params.workoutsPerWeek
      });

      if (validationResult.warnings.length > 0) {
        console.log("[/ai/workout] ⚠️  Validation warnings:", validationResult.warnings);
      } else {
        console.log("[/ai/workout] ✓ Plan validation passed with no warnings");
      }
    } catch (validationErr: any) {
      // Validation failed after normalization - log detailed error
      console.error("❌ /ai/workout FIRST PASS validation failed", {
        message: validationErr?.message,
        issuesPreview: validationErr?.message?.substring(0, 200)
      });

      // RETRY ONCE with stricter prompt
      console.log("[/ai/workout] 🔄 Retrying with stricter prompt...");

      try {
        const retrySystemPrompt = `אתה מאמן כושר. החזר JSON תקין בלבד.
CRITICAL REQUIREMENTS:
- goal: MUST BE EXACTLY "${normalizedGoal}" (not Hebrew, use this enum value)
- muscles_focus: MUST HAVE 1-5 items per day (not 0, not >5)
- tempo: ONLY "2-0-2" OR "החזק" (nothing else)
- reps: MUST BE range with dash like "8-12" (not single number)
Schema:
{"user_id":string,"goal":"${normalizedGoal}","days_per_week":${params.workoutsPerWeek},"plan":[{"day_name":string,"order":number,"muscles_focus":string[],"exercises":[{"name_he":string,"sets":number,"reps":string,"rest_seconds":number,"tempo":string,"target_muscles":string[],"order":number}],"total_sets":number}]}
Return ONLY valid JSON matching this schema.`;

        const retryUserPrompt = `Create ${params.workoutsPerWeek}-day ${normalizedGoal} workout for user ${params.userId}.
CRITICAL: goal="${normalizedGoal}", muscles_focus=1-5 items, tempo="2-0-2" or "החזק", reps="8-12" format.
JSON only.`;

        const retryCompletion = await withTimeout(
          openai.chat.completions.create({
            model: WORKOUT_MODEL,
            max_tokens: 4096,
            temperature: 0.2, // Lower temperature for stricter adherence
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: retrySystemPrompt },
              { role: "user", content: retryUserPrompt }
            ]
          }),
          60000 // 60 second timeout for gpt-4o
        );

        let retryResponseText = retryCompletion.choices[0]?.message?.content || "";
        retryResponseText = retryResponseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        const retryRawPlan = JSON.parse(retryResponseText);
        console.log("[/ai/workout] ✅ Retry JSON parsed");

        // Normalize retry result
        const retryNormalizationResult = normalizePlan(retryRawPlan, {
          goal: params.goal,
          workoutsPerWeek: params.workoutsPerWeek
        });

        finalPlan = retryNormalizationResult.plan;

        // Validate retry result
        validationResult = validatePlanOrThrow(finalPlan, {
          goal: normalizedGoal,
          daysPerWeek: params.workoutsPerWeek
        });

        console.log("[/ai/workout] ✅ Retry validation passed");
      } catch (retryErr: any) {
        // Retry also failed - return 422 with detailed issues
        console.error("❌ /ai/workout RETRY FAILED", {
          message: retryErr?.message,
          stack: retryErr?.stack?.substring(0, 200)
        });

        return res.status(422).json({
          ok: false,
          error_code: "PLAN_VALIDATION_FAILED",
          message: retryErr?.message ?? "Schema validation failed after normalization and retry",
          issues: validationErr?.message ? [validationErr.message] : null
        });
      }
    }

    // Resolve exercise IDs from database
    let resolvedResult;
    try {
      resolvedResult = await resolveExerciseIds(supabaseService, validationResult.plan);
      console.log("[/ai/workout] ✓ Exercise IDs resolved, missing:", resolvedResult.missing.length);
    } catch (dbErr: any) {
      console.error("❌ /ai/workout failed - DB resolution error", {
        message: dbErr?.message,
        stack: dbErr?.stack?.substring(0, 200),
      });

      return res.status(500).json({
        ok: false,
        error_code: "DB_RESOLUTION_FAILED",
        message: dbErr?.message ?? "Database query failed",
      });
    }

    // Combine all warnings
    const allWarnings: any = {};

    if (validationResult.warnings.length > 0) {
      allWarnings.messages = validationResult.warnings;
    }

    if (resolvedResult.missing.length > 0) {
      allWarnings.missingExercises = resolvedResult.missing;
      console.warn("[/ai/workout] ⚠️  Missing exercises from DB:", resolvedResult.missing.length, "exercises");
    }

    const elapsed = Date.now() - startTime;

    // Log success with metrics
    console.log("[/ai/workout] ✅ Generated plan successfully", {
      days: resolvedResult.planWithIds.plan.length,
      elapsed_ms: elapsed,
      model: WORKOUT_MODEL,
      warnings: Object.keys(allWarnings).length > 0 ? Object.keys(allWarnings) : 'none'
    });

    return res.json({
      ok: true,
      plan: resolvedResult.planWithIds,
      warnings: Object.keys(allWarnings).length > 0 ? allWarnings : undefined
    });
  } catch (err: any) {
    const elapsed = Date.now() - startTime;

    console.error("❌ /ai/workout failed - Unexpected error", {
      elapsed_ms: elapsed,
      message: err?.message,
      name: err?.name,
      stack: err?.stack,
      zodIssues: (err as any)?.issues ?? undefined,
      cause: (err as any)?.cause ?? undefined,
    });

    return res.status(500).json({
      ok: false,
      error_code: "GENERATION_FAILED",
      message: err?.message ?? "Unknown error during plan generation",
    });
  }
});

/**
 * POST /ai/nutrition - Generate 1-day kosher nutrition plan (JSON)
 */
planRouter.post("/nutrition", async (req, res) => {
  const startTime = Date.now();
  try {
    console.log("[/ai/nutrition] Request:", {
      gender: req.body.gender,
      age: req.body.age,
      goal: req.body.goalDisplay?.substring(0, 20)
    });

    const parsed = NutritionBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_input", details: parsed.error.issues });
    }

    const params = parsed.data;

    // System prompt for JSON-only output - concise
    const systemPrompt = `אתה תזונאי מקצועי. החזר **אך ורק** JSON תקין בדיוק במבנה הבא (ללא markdown):

{
  "meta": {
    "start_date": "YYYY-MM-DD",
    "days": 1,
    "goal": "loss",
    "activity_level": "beginner"|"intermediate"|"advanced",
    "calories_target": integer,
    "protein_target_g": integer,
    "carbs_target_g": integer,
    "fat_target_g": integer
  },
  "meals_flat": [
    {
      "day": "YYYY-MM-DD",
      "order": 1|2|3|4|5,
      "title": "ארוחת בוקר"|"ארוחת ביניים"|"ארוחת צהריים"|"ארוחת ערב",
      "time": "HH:MM–HH:MM",
      "desc": "פריט, פריט, פריט",
      "kcal": integer,
      "protein_g": integer,
      "carbs_g": integer,
      "fat_g": integer
    }
  ]
}

CRITICAL: The "goal" field MUST be EXACTLY "loss" (not "weight_loss" or anything else).
חמישה ארוחות בדיוק (בוקר, ביניים, צהריים, ביניים, ערב).
מזון כשר בלבד.

Return valid compact JSON only. No explanations.`;

    const userPrompt = `צור תוכנית תזונה ליום אחד:

- מגדר: ${params.gender}
- גיל: ${params.age}
- גובה: ${params.heightCm} ס"מ
- משקל: ${params.weight} ק"ג → ${params.targetWeight} ק"ג
- פעילות: ${params.activityDisplay}
- מטרה: ${params.goalDisplay}
- תאריך: ${params.startDateISO}

החזר JSON בלבד.`;

    // Call Claude with timeout
    const msg = await withTimeout(
      anthropic.messages.create({
        model: MODEL,
        max_tokens: 1000,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      }),
      60000 // 60 second timeout
    );

    let responseText = msg.content[0].type === "text" ? msg.content[0].text : "";

    // Clean markdown
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    // Parse JSON
    let nutritionData: any;
    try {
      nutritionData = JSON.parse(responseText);
    } catch (parseErr) {
      console.error("[/ai/nutrition] JSON parse error:", parseErr);
      return res.status(500).json({ ok: false, error: "invalid_json" });
    }

    // Validate with Zod
    const validationResult = NutritionPlanSchema.safeParse(nutritionData);
    if (!validationResult.success) {
      console.error("[/ai/nutrition] Validation failed:", validationResult.error.issues);
      return res.status(500).json({ ok: false, error: "validation_failed", details: validationResult.error.issues });
    }

    const elapsed = Date.now() - startTime;
    console.log("[/ai/nutrition] Generated JSON with", validationResult.data.meals_flat.length, "meals in", elapsed, "ms");
    return res.json({ ok: true, json: validationResult.data });
  } catch (err: any) {
    const elapsed = Date.now() - startTime;
    console.error("[/ai/nutrition] Error after", elapsed, "ms:", err.message);
    return res.status(500).json({ ok: false, error: "generation_failed", details: err?.message });
  }
});

/**
 * POST /ai/commit - Save program to database
 */
planRouter.post("/commit", async (req, res) => {
  try {
    console.log("[/ai/commit] Request for user:", req.body.userId);

    const parsed = CommitBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_input", details: parsed.error.issues });
    }

    const { userId, days, workoutText, nutritionJson } = parsed.data;

    // Validate nutrition JSON
    const nutritionValidation = NutritionPlanSchema.safeParse(nutritionJson);
    if (!nutritionValidation.success) {
      return res.status(400).json({ ok: false, error: "invalid_nutrition_json", details: nutritionValidation.error.issues });
    }

    // Check if a program already exists for this user
    const { data: existing } = await supabaseService
      .from("programs")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    // Generate ID for new programs, reuse existing ID for updates
    const programId = existing?.id || createId();

    // Upsert to programs table
    const { data, error } = await supabaseService
      .from("programs")
      .upsert({
        id: programId,
        user_id: userId,
        days_estimate: days,
        workout_plan_text: workoutText,
        nutrition_plan_json: nutritionJson,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id",
        ignoreDuplicates: false
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error("[/ai/commit] Supabase error:", error.message);
      return res.status(500).json({ ok: false, error: "database_error", details: error.message });
    }

    console.log("[/ai/commit] Saved program, days:", days, "workout length:", workoutText.length);

    // Insert normalized workout data into workouts and workout_exercises tables
    const normalizeSuccess = await insertNormalizedWorkouts(supabaseService, programId, workoutText);
    if (!normalizeSuccess) {
      console.warn("[/ai/commit] Failed to insert normalized workouts, but program was saved");
    } else {
      console.log("[/ai/commit] ✅ Normalized workouts inserted successfully");
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[/ai/commit] Error:", err.message);
    return res.status(500).json({ ok: false, error: "commit_failed", details: err?.message });
  }
});

/**
 * GET /ai/program/:userId - Fetch user's program
 */
planRouter.get("/program/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("[/ai/program] Fetch for user:", userId);

    if (!userId) {
      return res.status(400).json({ ok: false, error: "missing_user_id" });
    }

    const { data, error } = await supabaseService
      .from("programs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[/ai/program] Supabase error:", error.message);
      return res.status(500).json({ ok: false, error: "database_error", details: error.message });
    }

    if (!data) {
      return res.status(404).json({ ok: false, error: "program_not_found" });
    }

    console.log("[/ai/program] Found program, days:", data.days_estimate);
    return res.json({ ok: true, program: data });
  } catch (err: any) {
    console.error("[/ai/program] Error:", err.message);
    return res.status(500).json({ ok: false, error: "fetch_failed", details: err?.message });
  }
});
