import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

export const aiRouter = Router();

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.warn("Missing ANTHROPIC_API_KEY in environment");
}
const anthropic = new Anthropic({ apiKey });

/**
 * POST /ai/complete
 * body: { prompt: string }
 */
aiRouter.post("/complete", async (req, res) => {
  try {
    const prompt = (req.body?.prompt ?? "").toString().trim();
    if (!prompt) {
      return res.status(400).json({ ok: false, error: "missing_prompt" });
    }

    const msg = await anthropic.messages.create({
      model: (process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-20241022"),
      max_tokens: 128,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      Array.isArray(msg.content) && msg.content.length > 0 && "text" in msg.content[0]
        ? (msg.content[0] as any).text
        : "";

    return res.json({ ok: true, reply: text });
  } catch (err: any) {
    console.error("ai/complete error:", err);
    return res.status(500).json({ ok: false, error: "anthropic_failed", details: err?.message });
  }
});
