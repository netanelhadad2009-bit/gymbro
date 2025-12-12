import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase-server";
import { getUserProfileSync } from "@/lib/profile/getProfile";
import { buildSystemPrompt } from "@/lib/coach/systemPrompt";
import {
  getFullUserContext,
  summarizeMealsForPrompt,
  summarizeWeighInsForPrompt,
  summarizeWorkoutForPrompt,
  summarizePlanMealsForPrompt,
  summarizeProgressForPrompt,
} from "@/lib/coach/context";
import { detectIntent, getIntentName } from "@/lib/coach/intent";
import { generateDirectResponse } from "@/lib/coach/directResponse";
import removeMarkdown from "remove-markdown";
import { loadUserContext, type UserContext } from "@/lib/coach/loadUserContext";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Input validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(5000).optional(),
  content: z.string().min(1).max(5000).optional(),
}).refine(data => data.message || data.content, {
  message: "Either 'message' or 'content' is required",
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Serialize user context for system prompt
 *
 * Formats all available profile fields into a compact string.
 * Explicitly checks for numbers (including 0) to avoid dropping valid data.
 */
function serializeContext(ctx: UserContext): string {
  const parts: string[] = [];

  if (ctx.gender) {
    parts.push(`Gender: ${ctx.gender}`);
  }
  if (typeof ctx.age === 'number') parts.push(`Age: ${ctx.age}`);
  if (typeof ctx.height_cm === 'number') parts.push(`Height: ${ctx.height_cm} cm`);
  if (typeof ctx.weight_kg === 'number') parts.push(`Weight: ${ctx.weight_kg} kg`);
  if (typeof ctx.target_weight_kg === 'number') parts.push(`Target: ${ctx.target_weight_kg} kg`);
  if (ctx.activity) parts.push(`Activity: ${ctx.activity}`);
  if (ctx.diet) parts.push(`Diet: ${ctx.diet}`);
  if (Array.isArray(ctx.goals) && ctx.goals.length) parts.push(`Goals: ${ctx.goals.join(' / ')}`);
  if (ctx.frequency) parts.push(`Frequency: ${ctx.frequency}`);
  if (ctx.experience) parts.push(`Experience: ${ctx.experience}`);
  if (typeof ctx.bmi === 'number') parts.push(`BMI: ${ctx.bmi}`);

  return parts.join(', ').slice(0, 1500);
}

/**
 * Build dynamic nudge based on missing or concerning data
 *
 * Provides context-aware hints to the LLM when critical profile data is missing
 * or when specific conditions warrant special attention (e.g., low BMI, missing goals).
 *
 * @param ctx - User context
 * @returns English nudge string or empty string if no critical issues
 */
function buildDynamicNudge(ctx: UserContext): string {
  const missing: string[] = [];
  const concerns: string[] = [];

  // Check for missing critical fields
  if (!ctx.gender) missing.push('gender');
  if (typeof ctx.age !== 'number') missing.push('age');
  if (typeof ctx.height_cm !== 'number') missing.push('height');
  if (typeof ctx.weight_kg !== 'number') missing.push('current weight');
  if (typeof ctx.target_weight_kg !== 'number') missing.push('target weight');
  if (!ctx.goals || ctx.goals.length === 0) missing.push('goals');
  if (!ctx.diet) missing.push('diet type');

  // Check for concerning conditions
  if (typeof ctx.bmi === 'number' && ctx.bmi < 18.5) {
    concerns.push('BMI is below normal - emphasize nutritious eating and caloric surplus');
  }
  if (typeof ctx.bmi === 'number' && ctx.bmi > 30) {
    concerns.push('BMI is high - emphasize moderate caloric deficit');
  }

  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`Missing data: ${missing.join(', ')}.`);
  }
  if (concerns.length > 0) {
    parts.push(concerns.join('. '));
  }

  return parts.length > 0 ? `\n\nNote: ${parts.join(' ')}` : '';
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting check (strict for AI routes)
    const rateLimit = await checkRateLimit(req, {
      ...RateLimitPresets.ai,
      keyPrefix: 'coach-chat',
    });

    if (!rateLimit.allowed) {
      console.log('[AI Coach] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      console.error("[AI Coach] Authentication failed");
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(req, ChatRequestSchema);
    if (!validation.success) {
      return validation.response;
    }
    const { message, content } = validation.data;
    const userMessage = message || content || "";

    const truncatedMsg = userMessage.length > 120 ? userMessage.slice(0, 120) + "..." : userMessage;
    console.log("[AI Coach] Processing message for user:", user.id.slice(0, 8) + "...");
    console.log("[AI Coach] Message preview:", truncatedMsg);

    // 1. Detect intent
    const intent = detectIntent(userMessage);
    const intentName = getIntentName(intent);
    console.log("[AI Coach] Detected intent:", intentName, `(${intent})`);

    // 2. Load user context (new comprehensive loader)
    // IMPORTANT: Context loading should NOT block chat - failures are non-fatal
    let ctx: UserContext;
    let profile;
    let userContext;

    try {
      // Use new comprehensive context loader
      ctx = await loadUserContext();
      console.log("[AI Coach] Context loaded via new loader");

      // Load old profile format for backward compatibility with profile_snapshot
      profile = await getUserProfileSync(supabase, user.id);
    } catch (ctxErr) {
      console.error("[AI Coach] Context fetch failed (non-fatal):", ctxErr);
      // Continue with minimal context
      ctx = { userId: user.id };
      profile = {
        age: null,
        gender: null,
        height_cm: null,
        weight_kg: null,
        target_weight_kg: null,
        goal: null,
        diet: null,
        activityLevel: null,
        workout_days_per_week: null,
        injuries: null,
      };
    }

    // Try to load full user context (meals, weigh-ins, workouts, plan meals, progress)
    // Pass userId directly to avoid auth.getUser() issues in server context
    try {
      userContext = await getFullUserContext(supabase, { days: 30, userId: user.id });
      console.log("[AI Coach] Full context loaded:", {
        hasProfile: !!userContext?.profile,
        mealCount: userContext?.recent_meals?.length || 0,
        weighInCount: userContext?.weigh_ins?.length || 0,
        hasWorkoutProgram: !!userContext?.workout_program,
        planMealsCount: userContext?.plan_meals?.length || 0,
        hasProgress: !!userContext?.progress,
      });
    } catch (contextErr: any) {
      console.error("[AI Coach] Context fetch failed (non-fatal):", contextErr?.message || contextErr);
      userContext = null;
    }

    // 3. Try direct response for structured intents
    const directResponse = generateDirectResponse(intent, userContext);
    const responsePath = directResponse ? "direct" : "model";
    console.log("[AI Coach] Response path:", responsePath);

    // 4) Insert user message to database (RLS enforced)
    console.log("[AI Coach] Inserting user message...");
    const { data: insertedUserMsg, error: insertError } = await supabase
      .from("ai_messages")
      .insert({
        user_id: user.id, // Server-side enforcement - never trust client
        role: "user",
        content: userMessage,
        profile_snapshot: profile,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[AI Coach] Insert user message failed:", insertError);
      return NextResponse.json(
        {
          ok: false,
          error: "DatabaseError",
          message: "Failed to save message",
        },
        { status: 500 }
      );
    }

    console.log("[AI Coach] User message inserted");

    // 5) Generate assistant reply
    let assistantReply: string;
    let tokenCount = 0;

    if (directResponse) {
      // Use direct response (no AI model call)
      assistantReply = directResponse;
      console.log("[AI Coach] Using direct response (no model call)");
    } else {
      // Call OpenAI with enhanced context
      console.log("[AI Coach] Fetching conversation history...");
      const { data: history, error: historyError } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("user_id", user.id)
        .lt("created_at", insertedUserMsg.created_at)
        .order("created_at", { ascending: true })
        .limit(19);

      if (historyError) {
        console.error("[AI Coach] History fetch error:", historyError);
      }

      console.log(`[AI Coach] Loaded ${history?.length || 0} prior messages`);

      // Build enhanced system prompt with context serialization
      const ctxStr = serializeContext(ctx);
      console.debug("[Coach][SystemCtx] →", ctxStr.slice(0, 250), "... len=", ctxStr.length);

      // English system prompt template - FitJourney Personal Coach
      const systemPromptTemplate = `You are "FitJourney Personal Coach" — a fitness and nutrition assistant.

User Profile: {context}

You have full access to the following user data:
- Personal profile (gender, age, height, weight, goal, diet, experience, activity, BMI)
- Meal history and nutrition (what they ate)
- Planned menu (what they should eat)
- Workout program (exercises, days, progress)
- Weight history and trends
- Overall progress (points, streaks, badges)

Core Rules:
1. Use the data in every relevant response. If the user asks about their next workout - check the workout program.
2. NEVER say "I don't have access" or "I don't have that information" — you have full access to all data! If the data is empty, it means the user hasn't added info to the app yet. In that case, encourage them to add the information.
3. If the user hasn't logged meals/weigh-ins/workouts - don't say "I don't have access". Instead say: "I see you haven't logged [meals/weigh-ins/etc.] yet. Let's get started!" and provide guidance.
4. Match recommendations to goal: weight loss = caloric deficit, muscle gain = caloric surplus, body recomp = maintenance + high protein.
5. Always respond in English, keep answers short, numbered, in plain text (no Markdown, asterisks, or hashtags).
6. When answering workout questions - mention the program name, specific exercises, and sets/reps.
7. When answering nutrition questions - compare what they ate (meals) vs what they should eat (menu plan).
8. Remember: "No data" doesn't mean "no access". You have full access, the user just hasn't entered info yet.

Guidelines:
- If weight is below average → emphasize nutritious eating and caloric surplus.
- If goal is weight loss → focus on caloric deficit + high protein.
- If experience level is beginner → suggest simple programs and emotional support.
- If asked "what's my next workout" → answer based on workout program with specific exercises.`;

      // Add comprehensive data context (meals, weigh-ins, workouts, plan meals, progress)
      let dataContext = "";
      if (userContext) {
        const mealsSummary = summarizeMealsForPrompt(userContext);
        const weightSummary = summarizeWeighInsForPrompt(userContext);
        const workoutSummary = summarizeWorkoutForPrompt(userContext);
        const planMealsSummary = summarizePlanMealsForPrompt(userContext);
        const progressSummary = summarizeProgressForPrompt(userContext);

        dataContext = `\n\n--- Full User Data ---

Nutrition (Meals Eaten):
${mealsSummary}

Weight:
${weightSummary}

Workout Program:
${workoutSummary}

Meal Plan (What to Eat):
${planMealsSummary}

Progress & Activity:
${progressSummary}

--- End of Data ---`;
      } else {
        dataContext = `\n\nNote: No data available. Encourage the user to add info and use the app.`;
      }

      // Build dynamic nudge for missing/concerning data
      const nudge = buildDynamicNudge(ctx);

      // Inject context into template
      const systemPrompt = systemPromptTemplate.replace("{context}", ctxStr || "Missing data") + nudge + dataContext;

      // Few-shot examples to anchor behavior (English)
      // Dynamic examples based on whether user has data
      const hasWeighIns = (userContext?.weigh_ins?.length || 0) > 0;

      const fewShot: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "user",
          content: "How much protein do I need today?",
        },
        {
          role: "assistant",
          content: "Based on your data (Gender: male, Age: 23, Weight: 55 kg, Target: 62 kg, Goal: muscle gain) — I recommend about 110g of protein per day (roughly 2g per kg of body weight). This will help build muscle mass combined with strength training. You can split this across 4-5 meals throughout the day.",
        },
        {
          role: "user",
          content: "What do you know about my weigh-ins?",
        },
        {
          role: "assistant",
          // Show data-based response if user HAS weigh-ins, otherwise show encouragement
          content: hasWeighIns
            ? "Based on your weigh-in data:\n\nLatest weight: 75.4 kg\nTrend: Down 1.6 kg in the last week\nTotal weigh-ins: 6 records\n\nThe trend looks good! Keep weighing yourself once a week at the same time to get an accurate picture of your progress."
            : "I see you haven't logged any weigh-ins in the app yet. Let's start tracking your weight!\n\nTo add a weigh-in:\n1. Go to the Profile page\n2. Tap Add Weigh-in\n3. Enter your current weight",
        },
        {
          role: "user",
          content: "Tell me about myself",
        },
        {
          role: "assistant",
          content: "Based on my data:\n\n- Gender: Male\n- Age: 23\n- Height: 175 cm\n- Current weight: 55 kg\n- Target weight: 62 kg\n- BMI: 18.0 (below normal)\n- Goal: Build muscle\n- Experience: Beginner\n\nI'm here to help you reach your goal! Is there something specific you'd like to improve?",
        },
      ];

      // Prepare messages for OpenAI
      const prior = (history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        ...fewShot, // Inject examples AFTER system, BEFORE history
        ...prior,
        { role: "user", content: userMessage },
      ];

      // Debug: Log final prompt structure
      console.debug("[Coach] System prompt length:", systemPrompt.length);
      console.debug("[Coach] System prompt preview (first 500 chars):", systemPrompt.slice(0, 500));
      console.log("[Coach] Full context string being injected:", ctxStr);
      console.log("[Coach] Few-shot examples count:", fewShot.length / 2);
      console.log("[Coach] Total message array length:", messages.length);

      const contextTokenEstimate = Math.ceil(systemPrompt.length / 4);
      console.log("[AI Coach] Calling OpenAI with", messages.length, "messages, ~", contextTokenEstimate, "context tokens");

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const rawResponse = completion.choices[0]?.message?.content || "Something went wrong, please try again.";
      tokenCount = completion.usage?.total_tokens || 0;

      // Clean Markdown formatting to display as plain text
      assistantReply = removeMarkdown(rawResponse, {
        stripListLeaders: true,
        gfm: true,
        useImgAltText: false,
      })
        .replace(/\s{2,}/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      console.log("[AI Coach] OpenAI response received, tokens:", tokenCount);
      const rawPreview = rawResponse.length > 80 ? rawResponse.slice(0, 80) + "..." : rawResponse;
      console.log("[AI Coach] Response preview:", rawPreview);
    }

    // 6) Insert assistant reply to database (RLS enforced)
    console.log("[AI Coach] Inserting assistant reply...");
    const { data: insertedAiMsg, error: replyError } = await supabase
      .from("ai_messages")
      .insert({
        user_id: user.id, // Server-side enforcement - assistant messages belong to user
        role: "assistant",
        content: assistantReply,
        profile_snapshot: profile,
      })
      .select()
      .single();

    if (replyError) {
      console.error("[AI Coach] Insert assistant reply failed:", replyError);
      return NextResponse.json(
        {
          ok: false,
          error: "DatabaseError",
          message: "Failed to save response",
        },
        { status: 500 }
      );
    }

    console.log("[AI Coach] Assistant reply inserted");

    // Success - log summary (PII redacted)
    console.log("[AI Coach] ✓ Request completed:", {
      intent: intentName,
      path: responsePath,
      tokens: tokenCount || 0,
      contextWindow: userContext ? "30d" : "none",
      hasData: {
        meals: (userContext?.recent_meals?.length || 0) > 0,
        weighIns: (userContext?.weigh_ins?.length || 0) > 0,
        workoutProgram: !!userContext?.workout_program,
        planMeals: (userContext?.plan_meals?.length || 0) > 0,
        progress: !!userContext?.progress,
      },
    });

    return NextResponse.json({
      ok: true,
      message: assistantReply,
      reply: assistantReply, // backwards compatibility
      userMessage: insertedUserMsg,
      assistantMessage: insertedAiMsg,
    });
  } catch (error: any) {
    console.error("[AI Coach] Unexpected error:", error);

    // Handle OpenAI/AI errors specifically
    if (error?.name === 'APIError' || error?.message?.includes('OpenAI')) {
      console.error('[AI Coach] OpenAI API error:', error);
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
    return handleApiError(error, 'AI-Coach-Chat');
  }
}
