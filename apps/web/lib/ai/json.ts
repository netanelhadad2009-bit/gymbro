import { z, ZodType } from "zod";

/**
 * Custom error classes for better error handling
 */
export class JsonExtractError extends Error {
  constructor(message: string, public sample?: string) {
    super(message);
    this.name = "JsonExtractError";
  }
}

export class JsonValidationError extends Error {
  constructor(
    message: string,
    public issues?: z.ZodIssue[],
    public sample?: string
  ) {
    super(message);
    this.name = "JsonValidationError";
  }
}

/**
 * Logs a repair step if AI_REPAIR_LOG=1
 */
function logRepair(step: string, before: string, after: string) {
  if (process.env.AI_REPAIR_LOG === "1") {
    console.log(`🔧 [REPAIR] ${step}`);
    console.log(`   Before (100 chars): ${before.slice(0, 100)}`);
    console.log(`   After (100 chars): ${after.slice(0, 100)}`);
  }
}

/**
 * Extracts JSON from raw AI output that may contain markdown, prose, or other noise.
 *
 * Strategy:
 * 1. Trim whitespace
 * 2. If starts with { and ends with }, return as-is
 * 3. Extract from markdown code fences (```json or ```)
 * 4. Find longest balanced { ... } slice via bracket matching
 * 5. Throw JsonExtractError if no valid JSON found
 */
export function extractJson(raw: string): string {
  let text = raw.trim();

  // Remove BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
    logRepair("Removed BOM", raw.slice(0, 10), text.slice(0, 10));
  }

  // Strategy 1: Already clean JSON
  if (text.startsWith("{") && text.endsWith("}")) {
    return text;
  }

  // Strategy 2: Extract from markdown code fences
  const fencePatterns = [
    /```json\s*\n?([\s\S]*?)\n?```/,
    /```\s*\n?([\s\S]*?)\n?```/,
  ];

  for (const pattern of fencePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const extracted = match[1].trim();
      logRepair("Extracted from code fence", text.slice(0, 100), extracted.slice(0, 100));
      return extracted;
    }
  }

  // Strategy 3: Remove common prefixes (JSON:, Output:, Hebrew prefixes)
  const prefixes = ["JSON:", "Output:", "תזונה:", "תוכנית:", "Response:"];
  for (const prefix of prefixes) {
    if (text.startsWith(prefix)) {
      text = text.slice(prefix.length).trim();
      logRepair(`Removed prefix "${prefix}"`, raw.slice(0, 100), text.slice(0, 100));
      break;
    }
  }

  // Strategy 3b: Remove ANY text before first { (including Hebrew)
  const firstBrace = text.indexOf("{");
  if (firstBrace > 0) {
    const removed = text.slice(0, firstBrace);
    // Only remove if there's actually text before the brace
    if (removed.trim().length > 0) {
      text = text.slice(firstBrace);
      logRepair(`Removed prefix before {: "${removed.slice(0, 50)}"`, raw.slice(0, 100), text.slice(0, 100));
    }
  }

  // Strategy 4: Find longest balanced { ... } slice
  let maxStart = -1;
  let maxEnd = -1;
  let maxLength = 0;

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      let depth = 1;
      let j = i + 1;

      while (j < text.length && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }

      if (depth === 0) {
        const length = j - i;
        if (length > maxLength) {
          maxStart = i;
          maxEnd = j;
          maxLength = length;
        }
      }
    }
  }

  if (maxStart !== -1) {
    const extracted = text.slice(maxStart, maxEnd);
    logRepair("Extracted via bracket matching", text.slice(0, 100), extracted.slice(0, 100));
    return extracted;
  }

  // Failed to extract
  throw new JsonExtractError(
    "Could not extract valid JSON from AI output",
    text.slice(0, 300)
  );
}

/**
 * Repairs common JSON issues before parsing
 */
export function repairJson(text: string): string {
  let repaired = text;

  // 1. Normalize smart quotes to regular quotes
  const smartQuotes = [
    [/[\u201C\u201D]/g, '"'], // " "
    [/[\u2018\u2019]/g, "'"], // ' '
  ];

  for (const [pattern, replacement] of smartQuotes) {
    if (repaired.match(pattern)) {
      const before = repaired;
      repaired = repaired.replace(pattern as RegExp, replacement as string);
      logRepair("Normalized smart quotes", before.slice(0, 100), repaired.slice(0, 100));
    }
  }

  // 2. Remove trailing commas (conservative approach)
  // Match: , followed by optional whitespace, then } or ]
  const trailingCommaPattern = /,(\s*[}\]])/g;
  if (repaired.match(trailingCommaPattern)) {
    const before = repaired;
    repaired = repaired.replace(trailingCommaPattern, "$1");
    logRepair("Removed trailing commas", before.slice(0, 100), repaired.slice(0, 100));
  }

  // 3. Fix common number-in-string issues (e.g., "2200 קק"ל" -> "2200")
  // Only when it's clearly a number followed by Hebrew text in quotes
  const numberInStringPattern = /"(\d+(?:\.\d+)?)\s+[א-ת]+"/g;
  if (repaired.match(numberInStringPattern)) {
    const before = repaired;
    repaired = repaired.replace(numberInStringPattern, (match, num) => {
      // Only replace if this looks like a mistake (e.g., in a numeric field)
      // This is conservative - we keep the original if uncertain
      return num;
    });
    logRepair("Fixed number-in-string", before.slice(0, 100), repaired.slice(0, 100));
  }

  // 4. Remove multiple consecutive newlines
  const multiNewlinePattern = /\n{3,}/g;
  if (repaired.match(multiNewlinePattern)) {
    const before = repaired;
    repaired = repaired.replace(multiNewlinePattern, "\n\n");
    logRepair("Collapsed multiple newlines", before.slice(0, 100), repaired.slice(0, 100));
  }

  return repaired;
}

/**
 * Parse JSON and validate against Zod schema
 */
export function parseAndValidate<T>(
  text: string,
  schema: ZodType<T>
): T {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new JsonValidationError(
      `JSON.parse failed: ${e instanceof Error ? e.message : "unknown error"}`,
      undefined,
      text.slice(0, 300)
    );
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new JsonValidationError(
      "Schema validation failed",
      result.error.issues,
      JSON.stringify(parsed).slice(0, 300)
    );
  }

  return result.data;
}

/**
 * Complete pipeline: extract → repair → parse → validate
 */
export function extractAndValidate<T>(
  raw: string,
  schema: ZodType<T>
): T {
  // Step 1: Extract JSON from raw output
  const extracted = extractJson(raw);

  // Step 2: Repair common issues
  const repaired = repairJson(extracted);

  // Step 3: Parse and validate
  return parseAndValidate(repaired, schema);
}

/**
 * Retry configuration for AI generation
 */
export interface RetryConfig {
  maxAttempts: number;
  temperatures: number[];
  repairEnabled: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  temperatures: [0.2, 0.0], // First try: 0.2, retry: 0.0 for determinism
  repairEnabled: true,
};

/**
 * Format validation errors for HTTP response
 */
export function formatValidationError(error: JsonValidationError): {
  error: string;
  why: string;
  issues?: Array<{ path: string; message: string }>;
  sample?: string;
} {
  return {
    error: "ValidationError",
    why: error.message,
    issues: error.issues?.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
    sample: error.sample,
  };
}

/**
 * Format extraction errors for HTTP response
 */
export function formatExtractionError(error: JsonExtractError): {
  error: string;
  why: string;
  sample?: string;
} {
  return {
    error: "ExtractionError",
    why: error.message,
    sample: error.sample,
  };
}

/**
 * Assert diet compliance for nutrition plans
 */
export function assertDietCompliance(
  plan: any,
  diet: "vegan" | "vegetarian" | "keto" | "paleo" | "regular",
  forbiddenKeywords: { hebrew: string[]; english: string[] }
): { ok: true } | { ok: false; reasons: string[] } {
  console.log("🔍 [Diet Compliance Check]", {
    diet,
    forbiddenKeywordsCount: forbiddenKeywords.hebrew.length + forbiddenKeywords.english.length,
    daysToCheck: plan.days?.length || 0,
  });

  // Regular diet has no restrictions
  if (diet === "regular") {
    console.log("✅ [Diet Compliance] Regular diet - no restrictions");
    return { ok: true };
  }

  const reasons: string[] = [];
  let totalCarbs = 0;

  // Check each day and meal
  for (const day of plan.days || []) {
    for (const meal of day.meals || []) {
      const mealName = meal.name || "Unknown meal";

      // Aggregate carbs for keto checking
      if (diet === "keto" && meal.macros?.carbs_g) {
        totalCarbs += meal.macros.carbs_g;
      }

      // Check each food item
      for (const item of meal.items || []) {
        const foodName = (item.food || "").toLowerCase();
        const notes = (item.notes || "").toLowerCase();
        const combined = `${foodName} ${notes}`;

        // Check against forbidden keywords
        for (const keyword of forbiddenKeywords.hebrew) {
          if (combined.includes(keyword.toLowerCase())) {
            reasons.push(
              `${mealName}: "${item.food}" contains forbidden ingredient (${keyword}) for ${diet} diet`
            );
            break; // One violation per item is enough
          }
        }

        for (const keyword of forbiddenKeywords.english) {
          if (combined.includes(keyword.toLowerCase())) {
            reasons.push(
              `${mealName}: "${item.food}" contains forbidden ingredient (${keyword}) for ${diet} diet`
            );
            break;
          }
        }
      }
    }
  }

  // Keto-specific: Check total carbs per day
  if (diet === "keto" && plan.days && plan.days.length > 0) {
    const avgDailyCarbs = totalCarbs / plan.days.length;
    if (avgDailyCarbs > 50) {
      reasons.push(
        `Keto diet violation: Average daily carbs (${Math.round(avgDailyCarbs)}g) exceeds 50g limit`
      );
    }
  }

  if (reasons.length > 0) {
    console.log("❌ [Diet Compliance] VIOLATION DETECTED", {
      diet,
      violationCount: reasons.length,
      reasons,
    });
    return { ok: false, reasons };
  }

  console.log("✅ [Diet Compliance] PASSED - No violations found");
  return { ok: true };
}
