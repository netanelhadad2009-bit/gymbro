import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseServer } from "@/lib/supabase-server";
import { getUserProfileSync } from "@/lib/profile/getProfile";
import { buildSystemPrompt } from "@/lib/coach/systemPrompt";
import { getUserContext, summarizeMealsForPrompt, summarizeWeighInsForPrompt } from "@/lib/coach/context";
import { detectIntent, getIntentName } from "@/lib/coach/intent";
import { generateDirectResponse } from "@/lib/coach/directResponse";
import removeMarkdown from "remove-markdown";
import { loadUserContext, type UserContext } from "@/lib/coach/loadUserContext";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

/**
 * Serialize user context to Hebrew for system prompt
 *
 * Formats all available profile fields into a compact Hebrew string.
 * Explicitly checks for numbers (including 0) to avoid dropping valid data.
 */
function serializeContextHe(ctx: UserContext): string {
  const parts: string[] = [];

  if (ctx.gender) {
    const genderHe = ctx.gender === 'male' ? 'זכר' : ctx.gender === 'female' ? 'נקבה' : ctx.gender;
    parts.push(`מין: ${genderHe}`);
  }
  if (typeof ctx.age === 'number') parts.push(`גיל: ${ctx.age}`);
  if (typeof ctx.height_cm === 'number') parts.push(`גובה: ${ctx.height_cm} ס"מ`);
  if (typeof ctx.weight_kg === 'number') parts.push(`משקל: ${ctx.weight_kg} ק"ג`);
  if (typeof ctx.target_weight_kg === 'number') parts.push(`יעד: ${ctx.target_weight_kg} ק"ג`);
  if (ctx.activity) parts.push(`פעילות: ${ctx.activity}`);
  if (ctx.diet) parts.push(`דיאטה: ${ctx.diet}`);
  if (Array.isArray(ctx.goals) && ctx.goals.length) parts.push(`מטרות: ${ctx.goals.join(' / ')}`);
  if (ctx.frequency) parts.push(`תדירות: ${ctx.frequency}`);
  if (ctx.experience) parts.push(`ניסיון: ${ctx.experience}`);
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
 * @returns Hebrew nudge string or empty string if no critical issues
 */
function buildDynamicNudge(ctx: UserContext): string {
  const missing: string[] = [];
  const concerns: string[] = [];

  // Check for missing critical fields
  if (!ctx.gender) missing.push('מין');
  if (typeof ctx.age !== 'number') missing.push('גיל');
  if (typeof ctx.height_cm !== 'number') missing.push('גובה');
  if (typeof ctx.weight_kg !== 'number') missing.push('משקל נוכחי');
  if (typeof ctx.target_weight_kg !== 'number') missing.push('משקל יעד');
  if (!ctx.goals || ctx.goals.length === 0) missing.push('מטרות');
  if (!ctx.diet) missing.push('סוג תזונה');

  // Check for concerning conditions
  if (typeof ctx.bmi === 'number' && ctx.bmi < 18.5) {
    concerns.push('BMI נמוך מהנורמה - שים דגש על תזונה מחזקת');
  }
  if (typeof ctx.bmi === 'number' && ctx.bmi > 30) {
    concerns.push('BMI גבוה - שים דגש על גירעון קלורי מתון');
  }

  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`חסרים נתונים: ${missing.join(', ')}.`);
  }
  if (concerns.length > 0) {
    parts.push(concerns.join('. '));
  }

  return parts.length > 0 ? `\n\nהערה: ${parts.join(' ')}` : '';
}

export async function POST(req: Request) {
  try {
    // Create Supabase client with user's session from cookies
    const supabase = supabaseServer();

    // Verify user authentication
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      console.error("[AI Chat] Unauthorized:", userErr);
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { message, content } = body;
    const userMessage = message || content;

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { ok: false, error: "Message content is required" },
        { status: 400 }
      );
    }

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

    // Try to load user context (meals, weigh-ins) - failures are non-fatal
    try {
      userContext = await getUserContext(supabase, { days: 30 });
      console.log("[AI Coach] Context loaded:", {
        hasProfile: !!userContext?.profile,
        mealCount: userContext?.recent_meals?.length || 0,
        weighInCount: userContext?.weigh_ins?.length || 0,
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
          stage: "insert_user",
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
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

      // Build enhanced system prompt with NEW context serialization
      const ctxHe = serializeContextHe(ctx);
      console.debug("[Coach][SystemCtx] →", ctxHe.slice(0, 250), "... len=", ctxHe.length);

      // Strict Hebrew-first system prompt template (context injected below) - Updated for FitJourney brand
      const systemPromptTemplate = `אתה "המאמן האישי של FitJourney" — עוזר אימונים ותזונה בעברית.

נתוני המשתמש שלך: {contextHe}

חוקי עבודה קשיחים:
1. השתמש בנתוני המשתמש (מין, גיל, גובה, משקל, יעד, דיאטה, ניסיון, פעילות, BMI) בכל תשובה רלוונטית.
2. אל תאמר "אין לי גישה" או "איני יודע" — תמיד יש לך גישה לנתונים שבראש ההודעה הזו.
3. אם נתון חסר — שאל בעדינות בעברית ("מה הגובה שלך?") ואז תן תשובה שימושית גם בלעדיו.
4. התאם המלצות למטרה: ירידה במשקל = גירעון קלורי, עלייה במסה = עודף קלורי, חיטוב = שמירה + חלבון.
5. תשובות תמיד בעברית, קצרות, ממוספרות, בטקסט פשוט (בלי Markdown, כוכביות, או האשטגים).

דוגמאות:
- אם המשקל נמוך מהממוצע → הדגש תזונה מחזקת ועודף קלורי.
- אם המטרה ירידה במשקל → התמקד בגירעון קלורי + חלבון גבוה.
- אם רמת הניסיון מתחיל → הצע תוכניות פשוטות ותמיכה רגשית.`;

      // Add data context (meals, weigh-ins)
      let dataContext = "";
      if (userContext) {
        const mealsSummary = summarizeMealsForPrompt(userContext);
        const weightSummary = summarizeWeighInsForPrompt(userContext);
        dataContext = `\n\n--- נתוני משתמש אחרונים ---\n\nתזונה:\n${mealsSummary}\n\nמשקל:\n${weightSummary}\n\n--- סוף נתונים ---`;
      } else {
        dataContext = `\n\nשים לב: אין נתוני תזונה או שקילה. עודד את המשתמש להוסיף מידע.`;
      }

      // Build dynamic nudge for missing/concerning data
      const nudge = buildDynamicNudge(ctx);

      // Inject context into template
      const systemPrompt = systemPromptTemplate.replace("{contextHe}", ctxHe || "חסרים נתונים") + nudge + dataContext;

      // Few-shot examples to anchor behavior (Hebrew)
      const fewShot: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "user",
          content: "כמה חלבון אני צריך היום?",
        },
        {
          role: "assistant",
          content: "בהתאם לנתונים שלך (מין: זכר, גיל: 23, משקל: 55 קג, יעד: 62 קג, מטרה: עלייה במסה) — אני ממליץ על כ-110 גרם חלבון ביום (כ-2 גרם לקילו משקל גוף). זה יעזור לבנות מסת שריר בשילוב עם אימוני כוח. תוכל לחלק את זה ל-4-5 ארוחות ביום.",
        },
        {
          role: "user",
          content: "ספר לי על עצמי",
        },
        {
          role: "assistant",
          content: "לפי המידע שלי:\n\n- מין: זכר\n- גיל: 23\n- גובה: 175 סמ\n- משקל נוכחי: 55 קג\n- משקל יעד: 62 קג\n- BMI: 18.0 (נמוך מהנורמה)\n- מטרה: עלייה במסה\n- ניסיון: מתחיל\n\nאני כאן כדי לעזור לך להגיע ליעד! האם יש משהו ספציפי שתרצה לשפר?",
        },
      ];

      // Prepare messages for OpenAI
      const prior = (history || []).map((msg) => ({
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
      console.log("[Coach] Full context string being injected:", ctxHe);
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

      const rawResponse = completion.choices[0]?.message?.content || "משהו השתבש, נסה שוב 😅";
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
          stage: "insert_assistant",
          error: replyError.message,
          code: replyError.code,
          details: replyError.details,
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
    console.error("[AI Coach] Unexpected error:", error?.message || error);
    return NextResponse.json(
      {
        ok: false,
        stage: "unknown",
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
