import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { evaluateNode, UserContext } from "@/lib/journey/compute";
import { validateTaskType, ALLOWED_TASK_TYPES } from "@/lib/journey/taskTypes";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

const TrackBodySchema = z.object({
  task_key: z.string().min(1),
  task_type: z.string().optional(),
  value: z.any().optional(),
  node_id: z.string().uuid().optional()
});

/**
 * POST /api/journey/track
 *
 * Tracks task progress for a specific node.
 * Updates the user's progress_json and evaluates if conditions are met.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log("[JourneyTrack] POST /api/journey/track - Start");

    // Rate limiting check (STANDARD preset - tracking operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'journey-track-post',
    });

    if (!rateLimit.allowed) {
      console.log('[JourneyTrack] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, TrackBodySchema);
    if (!validation.success) {
      return validation.response;
    }

    const { task_key, task_type, value, node_id } = validation.data;

    // Validate task type if provided
    if (task_type && !validateTaskType(task_type)) {
      console.error("[JourneyTrack] Invalid task type:", task_type);
      return ErrorResponses.badRequest(
        `Invalid task type: ${task_type}. Allowed types: ${ALLOWED_TASK_TYPES.join(', ')}`
      );
    }

    const userId = user.id;
    console.log("[JourneyTrack] Authenticated:", {
      userId: userId.substring(0, 8),
      task_key,
      node_id: node_id?.substring(0, 8)
    });

    // If node_id provided, update specific node progress
    if (node_id) {
      // Fetch current progress
      const { data: currentProgress, error: fetchError } = await supabase
        .from("user_progress")
        .select("progress_json, state")
        .eq("user_id", userId)
        .eq("node_id", node_id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("[JourneyTrack] Fetch error:", fetchError.message);
        return NextResponse.json(
          { ok: false, error: "DatabaseError", message: fetchError.message },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      // Merge new progress
      const existingProgress = currentProgress?.progress_json || {};
      const updatedProgress = {
        ...existingProgress,
        [task_key]: value !== undefined ? value : true,
        last_updated: new Date().toISOString()
      };

      // Upsert progress
      const { error: upsertError } = await supabase
        .from("user_progress")
        .upsert({
          user_id: userId,
          node_id: node_id,
          progress_json: updatedProgress,
          state: currentProgress?.state || "ACTIVE"
        }, {
          onConflict: "user_id,node_id"
        });

      if (upsertError) {
        console.error("[JourneyTrack] Upsert error:", upsertError.message);
        return NextResponse.json(
          { ok: false, error: "DatabaseError", message: upsertError.message },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      // Fetch node conditions
      const { data: node, error: nodeError } = await supabase
        .from("journey_nodes")
        .select("conditions_json")
        .eq("id", node_id)
        .single();

      if (nodeError) {
        console.error("[JourneyTrack] Node fetch error:", nodeError.message);
        return NextResponse.json(
          { ok: false, error: "DatabaseError", message: nodeError.message },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      // Get user context (simplified - in production you'd fetch from fn_user_context)
      const userContext: UserContext = await fetchUserContext(supabase, userId);

      // Evaluate conditions
      const evaluation = evaluateNode(
        node.conditions_json,
        userContext,
        updatedProgress
      );

      const duration = Date.now() - startTime;
      console.log("[JourneyTrack] Success:", {
        userId: userId.substring(0, 8),
        node_id: node_id.substring(0, 8),
        task_key,
        canComplete: evaluation.canComplete,
        satisfied: evaluation.satisfied.length,
        missing: evaluation.missing.length,
        duration: `${duration}ms`
      });

      return NextResponse.json(
        {
          ok: true,
          can_complete: evaluation.canComplete,
          satisfied: evaluation.satisfied,
          missing: evaluation.missing
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // Generic tracking without node_id (just log the action)
    const duration = Date.now() - startTime;
    console.log("[JourneyTrack] Generic track:", {
      userId: userId.substring(0, 8),
      task_key,
      duration: `${duration}ms`
    });

    return NextResponse.json(
      {
        ok: true,
        message: "Task tracked (no specific node)"
      },
      { headers: NO_CACHE_HEADERS }
    );

  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error("[JourneyTrack] Fatal error:", {
      message: err?.message,
      duration: `${duration}ms`
    });
    return handleApiError(err, 'JourneyTrack');
  }
}

/**
 * Fetch user context for condition evaluation
 * In production, this would call fn_user_context or similar
 */
async function fetchUserContext(supabase: any, userId: string): Promise<UserContext> {
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's meals
  const { data: meals } = await supabase
    .from("meals")
    .select("calories, protein, carbs, fat")
    .eq("user_id", userId)
    .eq("date", today);

  const mealsCount = meals?.length || 0;
  const proteinToday = meals?.reduce((sum: number, m: any) => sum + (m.protein || 0), 0) || 0;
  const carbsToday = meals?.reduce((sum: number, m: any) => sum + (m.carbs || 0), 0) || 0;
  const fatToday = meals?.reduce((sum: number, m: any) => sum + (m.fat || 0), 0) || 0;
  const caloriesToday = meals?.reduce((sum: number, m: any) => sum + (m.calories || 0), 0) || 0;

  // Fetch today's weight
  const { data: weights } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .eq("date", today)
    .limit(1);

  const weighedInToday = (weights?.length || 0) > 0;

  // TODO: Fetch streak data, totals, etc. from database
  // This is a simplified version

  return {
    weighed_in_today: weighedInToday,
    meals_logged_today: mealsCount,
    protein_today_g: proteinToday,
    carbs_today_g: carbsToday,
    fat_today_g: fatToday,
    calories_today: caloriesToday,
    log_streak_days: 0, // TODO: Calculate from database
    weigh_streak_days: 0,
    total_meals_logged: 0,
    total_weigh_ins: 0,
    avg_protein_weekly: 0,
    avg_calories_weekly: 0
  };
}
