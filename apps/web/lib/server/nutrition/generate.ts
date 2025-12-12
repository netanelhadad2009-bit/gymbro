import { z } from "zod";
import { generateJson } from "@/lib/ai";
import { NutritionPlan } from "@/lib/schemas/nutrition";
import { nutritionSystem, nutritionUser } from "@/lib/prompts/nutrition";
import { mapDietHeToToken, getForbiddenKeywords } from "@/lib/mappers/nutrition";
import { assertDietCompliance } from "@/lib/ai/json";
import { profileFingerprint } from "@/lib/storage";

/**
 * Input payload for nutrition plan generation (English enums)
 */
export type NutritionPayload = {
  gender: "male" | "female" | "other";
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity: "sedentary" | "light" | "moderate" | "high";
  goal: "loss" | "gain" | "recomp" | "maintain";
  diet: "none" | "vegan" | "vegetarian" | "keto" | "paleo" | "low_carb" | "mediterranean";
  days: number;
};

/**
 * Result from nutrition plan generation
 */
export type NutritionGenerationResult = {
  plan: any; // The full nutrition plan object with days array
  calories: number | null;
  fingerprint: string;
};

/**
 * Validation schema for nutrition payload (English enums)
 */
export const NutritionPayloadSchema = z.object({
  gender: z.enum(["male", "female", "other"], { errorMap: () => ({ message: "gender must be 'male', 'female', or 'other'" }) }),
  age: z.number().int().positive("age must be a positive integer"),
  height_cm: z.number().positive("height_cm must be positive"),
  weight_kg: z.number().positive("weight_kg must be positive"),
  target_weight_kg: z.number().positive("target_weight_kg must be positive"),
  activity: z.enum(["sedentary", "light", "moderate", "high"], { errorMap: () => ({ message: "activity must be 'sedentary', 'light', 'moderate', or 'high'" }) }),
  goal: z.enum(["loss", "gain", "recomp", "maintain"], { errorMap: () => ({ message: "goal must be 'loss', 'gain', 'recomp', or 'maintain'" }) }),
  diet: z.enum(["none", "vegan", "vegetarian", "keto", "paleo", "low_carb", "mediterranean"], { errorMap: () => ({ message: "diet must be one of the supported diet types" }) }),
  days: z.number().int().positive().max(14).default(1),
});

/**
 * Duplicate single day across multiple days
 */
function duplicateDays(plan: any, requestedDays: number) {
  if (plan.days.length === 1 && requestedDays > 1) {
    const templateDay = plan.days[0];
    plan.days = Array.from({ length: requestedDays }, (_, i) => ({
      ...templateDay,
      day: i + 1,
    }));
  }
  return plan;
}

/**
 * Generate a nutrition plan using AI
 *
 * This is the core generation logic shared between:
 * - /api/ai/nutrition (HTTP endpoint)
 * - /api/nutrition/attach (server-side fallback)
 *
 * @param payload - User profile data for generation
 * @param options - Generation options
 * @returns Promise<NutritionGenerationResult>
 * @throws Error if generation fails after retries or diet compliance check fails
 */
export async function generateNutritionPlan(
  payload: NutritionPayload,
  options?: {
    logPrefix?: string;
    enableVerboseLogging?: boolean;
  }
): Promise<NutritionGenerationResult> {
  const { logPrefix = "[NutritionGen]", enableVerboseLogging = false } = options || {};

  // Validate payload
  const validationResult = NutritionPayloadSchema.safeParse(payload);
  if (!validationResult.success) {
    throw new Error(`Invalid payload: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`);
  }

  const validPayload = validationResult.data;

  // Calculate fingerprint
  const fingerprint = profileFingerprint(validPayload);

  if (enableVerboseLogging) {
    console.log(`${logPrefix} Starting generation`, {
      days: validPayload.days,
      fingerprint: fingerprint.substring(0, 12),
    });
  }

  // Map diet enum to token for compliance checking
  const dietToken = mapDietHeToToken(validPayload.diet);
  const forbiddenKeywords = getForbiddenKeywords(dietToken);
  const model = process.env.OPENAI_MODEL_NUTRITION || "gpt-4o-mini";

  // Helper function for generating plan with retry
  const attemptGeneration = async (temperature: number, extraNote = ""): Promise<any> => {
    if (enableVerboseLogging) {
      console.log(`${logPrefix} OpenAI request starting`, {
        model,
        temperature,
        maxOutputTokens: 6000,
      });
    }

    const startTime = Date.now();

    try {
      const result = await generateJson({
        model,
        temperature,
        system: nutritionSystem(extraNote),
        user: nutritionUser({ ...validPayload, dietToken }),
        schema: NutritionPlan,
        maxOutputTokens: 6000,
      });

      const elapsed = Date.now() - startTime;
      if (enableVerboseLogging) {
        console.log(`${logPrefix} OpenAI request completed`, {
          elapsed_ms: elapsed,
          temperature,
        });
      }

      return result;
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      if (enableVerboseLogging) {
        console.error(`${logPrefix} OpenAI request failed`, {
          elapsed_ms: elapsed,
          error_name: error?.name,
          error_message: error?.message,
          temperature,
        });
      }
      throw error;
    }
  };

  let plan: any;

  // Helper to normalize shopping list units to valid enum values
  const normalizeShoppingListUnits = (plan: any): any => {
    if (!plan.shoppingList || !Array.isArray(plan.shoppingList)) {
      return plan;
    }

    const unitMap: Record<string, string> = {
      // Hebrew variations
      'גרם': 'g',
      'גרמים': 'g',
      'ג': 'g',
      'ג׳': 'g',
      'מ"ל': 'ml',
      'מיליליטר': 'ml',
      'מל': 'ml',
      'יחידות': 'pcs',
      'יח': 'pcs',
      'יח׳': 'pcs',
      'פריטים': 'pcs',
      // English variations
      'gram': 'g',
      'grams': 'g',
      'milliliter': 'ml',
      'milliliters': 'ml',
      'piece': 'pcs',
      'pieces': 'pcs',
      'unit': 'pcs',
      'units': 'pcs',
      // Already valid
      'g': 'g',
      'ml': 'ml',
      'pcs': 'pcs',
    };

    plan.shoppingList = plan.shoppingList.map((item: any) => {
      if (item.unit && typeof item.unit === 'string') {
        const normalized = unitMap[item.unit.toLowerCase()];
        if (normalized) {
          if (item.unit !== normalized && enableVerboseLogging) {
            console.log(`${logPrefix} Normalized shopping list unit: "${item.unit}" → "${normalized}"`);
          }
          return { ...item, unit: normalized };
        }
      }
      return item;
    });

    return plan;
  };

  // Attempt 1: Primary generation at temperature 0.2
  try {
    if (enableVerboseLogging) {
      console.log(`${logPrefix} Attempt 1/2: temperature 0.2, model ${model}`);
    }
    plan = await attemptGeneration(0.2);
    plan = normalizeShoppingListUnits(plan);
  } catch (e: any) {
    console.warn(`${logPrefix} First attempt failed:`, {
      name: e?.name,
      message: e?.message,
      stack: e?.stack?.split('\n').slice(0, 3).join('\n'),
    });

    // Attempt 2: Retry at temperature 0.0 with stricter instructions
    try {
      if (enableVerboseLogging) {
        console.log(`${logPrefix} Attempt 2/2: temperature 0.0 (retry with stricter prompt)`);
      }
      plan = await attemptGeneration(
        0.0,
        "\n\nCRITICAL: Last attempt failed validation. Output MUST match the JSON Schema EXACTLY. No markdown, no Hebrew prefaces or labels outside JSON. Shopping list units MUST be EXACTLY 'g', 'ml', or 'pcs'."
      );
      plan = normalizeShoppingListUnits(plan);
    } catch (retryError: any) {
      console.error(`${logPrefix} Retry failed:`, {
        name: retryError?.name,
        message: retryError?.message,
        stack: retryError?.stack?.split('\n').slice(0, 3).join('\n'),
      });
      throw new Error(`Failed to generate valid nutrition plan after 2 attempts: ${retryError?.message}`);
    }
  }

  // Check diet compliance (lenient mode)
  const compliance = assertDietCompliance(plan, dietToken, forbiddenKeywords);

  if (!compliance.ok) {
    // Count violations per meal to determine severity
    let totalMeals = 0;
    const mealsWithViolations = new Set<string>();

    // Extract meal names from violation reasons (format: "MealName: ...")
    for (const reason of compliance.reasons) {
      const mealMatch = reason.match(/^([^:]+):/);
      if (mealMatch) {
        mealsWithViolations.add(mealMatch[1]);
      }
    }

    // Count total meals
    for (const day of plan.days || []) {
      totalMeals += (day.meals || []).length;
    }

    const violatedMealCount = mealsWithViolations.size;
    const violationRate = totalMeals > 0 ? violatedMealCount / totalMeals : 0;

    console.warn(`${logPrefix} Diet compliance issues found:`, {
      violatedMeals: violatedMealCount,
      totalMeals,
      violationRate: `${(violationRate * 100).toFixed(1)}%`,
      itemViolations: compliance.reasons.length,
      affectedMeals: Array.from(mealsWithViolations),
      sampleReasons: compliance.reasons.slice(0, 3),
    });

    // LENIENT MODE: Only fail if most meals (>80%) have violations
    // This allows AI to make occasional mistakes without rejecting entire plan
    // User experience: "it's okay if a dish here or there doesn't fit the menu"
    const VIOLATION_THRESHOLD = 0.80; // Fail only if >80% of meals have issues

    if (violationRate > VIOLATION_THRESHOLD) {
      console.error(`${logPrefix} SEVERE diet violation: ${violatedMealCount}/${totalMeals} meals affected (${(violationRate * 100).toFixed(1)}%)`);
      throw new Error(`Diet violation: ${compliance.reasons.slice(0, 3).join(", ")}${compliance.reasons.length > 3 ? ` (${compliance.reasons.length - 3} more...)` : ''}`);
    }

    // Log warning but accept the plan
    console.warn(`${logPrefix} ⚠️ Accepting plan with minor diet violations (${violatedMealCount}/${totalMeals} meals affected - ${(violationRate * 100).toFixed(1)}%) - User can manually adjust if needed`);
  }

  // Duplicate days if needed
  const finalPlan = duplicateDays(plan, validPayload.days);

  // Extract calories
  const calories = finalPlan.dailyTargets?.calories || null;

  if (enableVerboseLogging) {
    console.log(`${logPrefix} Generation successful`, {
      calories,
      daysGenerated: finalPlan.days?.length || 0,
      fingerprint: fingerprint.substring(0, 12),
    });
  }

  return {
    plan: finalPlan,
    calories,
    fingerprint,
  };
}

/**
 * Generate nutrition plan with timeout wrapper
 *
 * @param payload - User profile data
 * @param timeoutMs - Timeout in milliseconds (default: 20000)
 * @returns Promise<NutritionGenerationResult>
 * @throws Error with name 'AbortError' on timeout
 */
export async function generateNutritionPlanWithTimeout(
  payload: NutritionPayload,
  timeoutMs: number = 20000,
  options?: {
    logPrefix?: string;
    enableVerboseLogging?: boolean;
  }
): Promise<NutritionGenerationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Note: We can't actually abort the generateNutritionPlan call with the signal
    // because it doesn't support it internally, but we can race it with a timeout
    const result = await Promise.race([
      generateNutritionPlan(payload, options),
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          const error = new Error(`Generation timed out after ${timeoutMs}ms`);
          error.name = 'AbortError';
          reject(error);
        });
      }),
    ]);

    clearTimeout(timeoutId);
    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}
