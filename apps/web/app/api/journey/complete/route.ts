import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { evaluateNode, UserContext } from "@/lib/journey/compute";
import { validateTaskType } from "@/lib/journey/taskTypes";
import { progressCache, cacheKeys } from "@/lib/journey/cache";
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

const CompleteBodySchema = z.object({
  node_id: z.string().uuid()
});

/**
 * POST /api/journey/complete
 *
 * Completes a journey node if conditions are met.
 * Awards points, badges, and unlocks the next node.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Rate limiting check (STRICT - prevents point farming)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.strict,
      keyPrefix: 'journey-complete',
    });

    if (!rateLimit.allowed) {
      console.log('[JourneyComplete] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, CompleteBodySchema);
    if (!validation.success) {
      return validation.response;
    }

    const { node_id } = validation.data;
    const userId = user.id;
    console.log("[JourneyComplete] Authenticated:", {
      userId: userId.substring(0, 8),
      node_id: node_id.substring(0, 8)
    });

    // Fetch node and current progress
    const { data: node, error: nodeError } = await supabase
      .from("journey_nodes")
      .select("id, chapter_id, order_index, conditions_json, title")
      .eq("id", node_id)
      .single();

    if (nodeError) {
      console.error("[JourneyComplete] Node fetch error:", nodeError.message);
      return NextResponse.json(
        { ok: false, error: "DatabaseError", message: nodeError.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    const { data: progress, error: progressError } = await supabase
      .from("user_progress")
      .select("progress_json, state")
      .eq("user_id", userId)
      .eq("node_id", node_id)
      .single();

    if (progressError && progressError.code !== "PGRST116") {
      console.error("[JourneyComplete] Progress fetch error:", progressError.message);
      return NextResponse.json(
        { ok: false, error: "DatabaseError", message: progressError.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Get user context
    const userContext: UserContext = await fetchUserContext(supabase, userId);

    // Evaluate conditions
    const evaluation = evaluateNode(
      node.conditions_json,
      userContext,
      progress?.progress_json || {}
    );

    if (!evaluation.canComplete) {
      console.log("[JourneyComplete] Conditions not met:", {
        userId: userId.substring(0, 8),
        node_id: node_id.substring(0, 8),
        missing: evaluation.missing
      });

      return NextResponse.json(
        {
          ok: false,
          error: "ConditionsNotMet",
          message: "Node conditions not satisfied",
          missing: evaluation.missing,
          satisfied: evaluation.satisfied
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    // Mark node as completed
    const { error: updateError } = await supabase
      .from("user_progress")
      .upsert({
        user_id: userId,
        node_id: node_id,
        state: "COMPLETED",
        completed_at: new Date().toISOString(),
        progress_json: progress?.progress_json || {}
      }, {
        onConflict: "user_id,node_id"
      });

    if (updateError) {
      console.error("[JourneyComplete] Update error:", updateError.message);
      return NextResponse.json(
        { ok: false, error: "DatabaseError", message: updateError.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Award points
    const pointsAwarded = 25;
    const { error: pointsError } = await supabase
      .from("user_points")
      .insert({
        user_id: userId,
        points: pointsAwarded,
        reason: `השלמת: ${node.title}`
      });

    if (pointsError) {
      console.warn("[JourneyComplete] Points error:", pointsError.message);
      // Non-fatal - continue
    }

    // Check if badge should be awarded (example logic)
    const shouldAwardBadge = await checkBadgeEligibility(supabase, userId, node_id);
    if (shouldAwardBadge) {
      const { error: badgeError } = await supabase
        .from("user_badges")
        .insert({
          user_id: userId,
          badge_code: `node_${node_id.substring(0, 8)}`
        })
        .select()
        .single();

      if (badgeError && badgeError.code !== "23505") { // Ignore duplicate constraint
        console.warn("[JourneyComplete] Badge error:", badgeError.message);
      }
    }

    // Find and unlock next node
    const { data: nextNode, error: nextError } = await supabase
      .from("journey_nodes")
      .select("id")
      .eq("chapter_id", node.chapter_id)
      .gt("order_index", node.order_index)
      .order("order_index", { ascending: true })
      .limit(1)
      .single();

    let nextNodeId: string | null = null;

    if (!nextError && nextNode) {
      nextNodeId = nextNode.id;

      // Mark next node as AVAILABLE
      const { error: unlockError } = await supabase
        .from("user_progress")
        .upsert({
          user_id: userId,
          node_id: nextNode.id,
          state: "AVAILABLE",
          progress_json: {}
        }, {
          onConflict: "user_id,node_id"
        });

      if (unlockError) {
        console.warn("[JourneyComplete] Unlock error:", unlockError.message);
        // Non-fatal
      }
    }

    // Invalidate cache to force fresh data on next journey load
    progressCache.invalidate(cacheKeys.journey(userId));
    progressCache.invalidate(cacheKeys.userPoints(userId));
    console.log("[JourneyComplete] Invalidated cache for user:", userId.substring(0, 8));

    const duration = Date.now() - startTime;
    console.log("[JourneyComplete] Success:", {
      userId: userId.substring(0, 8),
      node_id: node_id.substring(0, 8),
      points: pointsAwarded,
      next_node_id: nextNodeId?.substring(0, 8),
      duration: `${duration}ms`
    });

    return NextResponse.json(
      {
        ok: true,
        points_awarded: pointsAwarded,
        next_node_id: nextNodeId,
        message: `השלמת בהצלחה! קיבלת ${pointsAwarded} נקודות`
      },
      { headers: NO_CACHE_HEADERS }
    );

  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error("[JourneyComplete] Fatal error:", {
      message: err?.message,
      duration: `${duration}ms`
    });

    return handleApiError(err, 'JourneyComplete');
  }
}

/**
 * Fetch user context for condition evaluation
 */
async function fetchUserContext(supabase: any, userId: string): Promise<UserContext> {
  const today = new Date().toISOString().split("T")[0];

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

  const { data: weights } = await supabase
    .from("weight_logs")
    .select("weight_kg")
    .eq("user_id", userId)
    .eq("date", today)
    .limit(1);

  const weighedInToday = (weights?.length || 0) > 0;

  return {
    weighed_in_today: weighedInToday,
    meals_logged_today: mealsCount,
    protein_today_g: proteinToday,
    carbs_today_g: carbsToday,
    fat_today_g: fatToday,
    calories_today: caloriesToday,
    log_streak_days: 0,
    weigh_streak_days: 0,
    total_meals_logged: 0,
    total_weigh_ins: 0,
    avg_protein_weekly: 0,
    avg_calories_weekly: 0
  };
}

/**
 * Check if user is eligible for a badge
 */
async function checkBadgeEligibility(supabase: any, userId: string, nodeId: string): Promise<boolean> {
  // Example: Award badge for completing first node
  const { data } = await supabase
    .from("user_progress")
    .select("node_id")
    .eq("user_id", userId)
    .eq("state", "COMPLETED");

  const completedCount = data?.length || 0;

  // Award badge every 5 nodes
  return completedCount > 0 && completedCount % 5 === 0;
}
