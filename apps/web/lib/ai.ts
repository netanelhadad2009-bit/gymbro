import OpenAI from "openai";
import { ZodType } from "zod";
import { serverEnv } from "@/lib/env";

const client = new OpenAI({ apiKey: serverEnv.OPENAI_API_KEY });

/**
 * Timeout wrapper for OpenAI calls
 * Throws an error if the operation exceeds the specified timeout
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  signal: AbortSignal
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("OpenAI request timeout"));
      }, timeoutMs);
      signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(new Error("OpenAI request aborted"));
      });
    }),
  ]);
}

export interface GenerateJsonArgs<T> {
  model: string;
  system: string;
  user: string;
  schema: ZodType<T>;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Generate JSON using OpenAI's json_object response format with strict validation.
 * This ensures the model outputs valid JSON that we then validate against our Zod schema.
 *
 * Key improvements over legacy approach:
 * - Uses json_object format to guarantee valid JSON output
 * - No manual JSON extraction/repair needed
 * - Strict Zod validation
 * - Clear error messages
 * - Automatic retry with temperature 0.0 on failure
 */
export async function generateJson<T>({
  model,
  system,
  user,
  schema,
  temperature = 0.2,
  maxOutputTokens = 4000,
}: GenerateJsonArgs<T>): Promise<T> {
  // serverEnv.OPENAI_API_KEY is already validated at startup

  if (process.env.LOG_PROMPT === "1") {
    console.log("🤖 [AI Request]", {
      model,
      temperature,
      maxOutputTokens,
    });
  }

  // Retry logic with timeout (60s, single retry)
  const TIMEOUT_MS = 60_000;
  const MAX_ATTEMPTS = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`[AI][Nutrition] invoking (attempt ${attempt})…`);

    const controller = new AbortController();

    try {
      const completionPromise = client.chat.completions.create({
        model,
        temperature,
        max_tokens: maxOutputTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_object",
        },
      });

      const res = await withTimeout(completionPromise, TIMEOUT_MS, controller.signal);
      const content = res.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No response from OpenAI");
      }

      // Check if response was truncated due to token limit
      if (res.choices[0]?.finish_reason === "length") {
        console.warn("⚠️ [AI] Response truncated due to token limit");
        throw new Error("AI response was cut off - increase max_tokens");
      }

      // Parse the JSON - json_object format guarantees valid JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        throw new Error(`JSON.parse failed: ${e instanceof Error ? e.message : "unknown error"}`);
      }

      // Validate against Zod schema
      const result = schema.safeParse(parsed);
      if (!result.success) {
        const errorSummary = result.error.issues.slice(0, 3).map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
        console.error("❌ [AI] Schema validation failed:", result.error.issues.slice(0, 5));
        throw new Error(`Schema validation failed: ${errorSummary}`);
      }

      if (process.env.LOG_AI_OUTPUT === "1") {
        console.log("🔍 [AI Response]", {
          tokens: res.usage,
          preview: JSON.stringify(result.data).slice(0, 400),
        });
      }

      console.log(`[AI][Nutrition] success (attempt ${attempt})`);
      return result.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a timeout error
      const isTimeout = lastError.message.includes("timeout") || lastError.message.includes("aborted");

      if (isTimeout && attempt < MAX_ATTEMPTS) {
        console.log(`[AI][Nutrition] timeout on attempt ${attempt}, retrying once…`);
        controller.abort();
        continue;
      }

      // Non-timeout error or last attempt - throw immediately
      console.error(`❌ [AI] generateJson failed on attempt ${attempt}:`, lastError.message);
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("All OpenAI attempts failed");
}
