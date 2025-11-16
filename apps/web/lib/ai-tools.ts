import OpenAI from "openai";
import { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const SMART_QUOTES = /[""„‟«»‹›‚'']/g;
const RTL_MARKS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const CONTROL_EXCEPT_WS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;
const BOMS = /^\uFEFF/;

export function sanitizeLooseJson(text: string) {
  let cleaned = text
    .replace(BOMS, "")
    .replace(RTL_MARKS, "")
    .replace(SMART_QUOTES, '"')
    .replace(CONTROL_EXCEPT_WS, "")
    .replace(/^\s*(תזונה\s*:|סיכום\s*:|תוכנית\s*:)\s*/i, "");

  // Strip markdown code fences (```json ... ``` or ```...```)
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

  // Extract JSON if there's any text before/after
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }

  return cleaned.trim();
}

export function schemaToTool(schema: ZodType<any>) {
  // Convert Zod to JSON schema for tools/function calling
  let json: any;
  try {
    const raw = zodToJsonSchema(schema, {
      name: "EmitPayload",
      $refStrategy: "none",
    });

    // Clean schema for OpenAI function calling (strict requirements)
    json = {
      type: "object",
      properties: (raw as any).properties || {},
      required: (raw as any).required || [],
    };

    // Add additionalProperties if not strict mode
    if ((raw as any).additionalProperties !== undefined) {
      json.additionalProperties = (raw as any).additionalProperties;
    }

    if (process.env.LOG_PROMPT === "1") {
      console.log("🔧 Generated schema keys:", Object.keys(json.properties || {}));
    }
  } catch (e) {
    console.error("zodToJsonSchema error:", e);
    // Fallback: create a permissive object schema
    json = {
      type: "object",
      properties: {},
      additionalProperties: true,
    };
  }

  return {
    type: "function" as const,
    function: {
      name: "emit_payload",
      description:
        "Emit ONLY the final validated nutrition plan payload that strictly matches the JSON schema.",
      parameters: json,
    },
  };
}

export type ToolCallResult<T> = {
  ok: true; data: T; raw?: unknown;
} | {
  ok: false; error: string; raw?: unknown;
};

export async function callToolWithSchema<T>(opts: {
  client: OpenAI;
  model: string;
  system: string;
  user: string;
  schema: ZodType<T>;
  temperature?: number;
  seed?: number;
  maxOutputTokens?: number;
  log?: boolean;
}): Promise<ToolCallResult<T>> {
  const {
    client, model, system, user, schema,
    temperature = 0.2, seed = 7, maxOutputTokens = 4000, log = false
  } = opts;

  const tool = schemaToTool(schema);

  const res = await client.chat.completions.create({
    model,
    temperature,
    seed,
    max_tokens: maxOutputTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name: "emit_payload" } }, // force tool-call
  });

  if (log) {
    console.log("🧪 tool-call usage:", res.usage);
  }

  const first = res.choices?.[0];
  const toolCall = first?.message?.tool_calls?.[0];

  if (!toolCall || toolCall.type !== "function") {
    return { ok: false, error: "Model didn't call the tool", raw: res };
  }

  const functionCall = toolCall.function;
  if (!functionCall?.arguments) {
    return { ok: false, error: "Tool call missing arguments", raw: res };
  }

  // Sometimes OpenAI already returns parsed; if string, parse
  const argsText = typeof functionCall.arguments === "string"
    ? functionCall.arguments
    : JSON.stringify(functionCall.arguments);

  const sanitized = sanitizeLooseJson(argsText);

  let obj: unknown;
  try { obj = JSON.parse(sanitized); }
  catch (e) {
    return { ok: false, error: "Tool args not valid JSON", raw: { argsText: sanitized, e } };
  }

  const parsed = schema.safeParse(obj);
  if (!parsed.success) {
    return { ok: false, error: "Zod validation failed", raw: parsed.error.issues };
  }

  return { ok: true, data: parsed.data, raw: first };
}

export async function repairWithTool<T>(opts: {
  client: OpenAI;
  model: string;
  system: string;
  schema: ZodType<T>;
  invalidJson: unknown;
  zodIssues: unknown;
  temperature?: number;
  seed?: number;
  maxOutputTokens?: number;
  log?: boolean;
}): Promise<ToolCallResult<T>> {
  const { invalidJson, zodIssues } = opts;
  const userRepair = `Your previous JSON (below) does NOT satisfy the schema. Fix it and emit ONLY the corrected JSON via the tool.

Issues:
${JSON.stringify(zodIssues, null, 2)}

Previous JSON:
${typeof invalidJson === "string" ? invalidJson : JSON.stringify(invalidJson, null, 2)}`;

  return callToolWithSchema<T>({
    ...opts,
    user: userRepair,
    // keep same system; tool forces JSON
  });
}
