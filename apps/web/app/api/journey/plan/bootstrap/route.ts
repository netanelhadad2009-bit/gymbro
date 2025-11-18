import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPlanForAvatar, hasExistingPlan } from "@/lib/journey/planBootstrap";
import { buildJourneyFromPersona, type Persona } from "@/lib/journey/builder";
import { normalizePersona } from "@/lib/persona/normalize";
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from "@/lib/api/security";
import { randomUUID } from "crypto";

/**
 * Generate a deterministic UUID v5 from a namespace and name
 * This ensures the same persona always gets the same IDs (idempotent)
 */
function deterministicUUID(namespace: string, name: string): string {
  // Use a simple hash to create deterministic UUIDs
  // Format: persona_key + chapter/node identifier
  const hash = `${namespace}-${name}`;
  const crypto = require('crypto');
  const md5 = crypto.createHash('md5').update(hash).digest('hex');

  // Format as UUID v4
  return `${md5.substring(0, 8)}-${md5.substring(8, 12)}-${md5.substring(12, 16)}-${md5.substring(16, 20)}-${md5.substring(20, 32)}`;
}

export const dynamic = "force-dynamic";

/**
 * POST /api/journey/plan/bootstrap
 *
 * Creates a personalized journey plan based on the user's avatar.
 * Idempotent: If avatar-sourced chapters already exist, returns existing plan instead of creating duplicates.
 *
 * Requirements:
 * - User must be authenticated
 * - User must have an assigned avatar
 *
 * Returns:
 * - 200: Plan summary (avatar, chapters, task count)
 * - 400: No avatar assigned
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (AUTH preset - one-time bootstrap operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.auth,
      keyPrefix: 'journey-plan-bootstrap',
    });

    if (!rateLimit.allowed) {
      console.log('[BootstrapAPI] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const userId = user.id;
    console.log("[BootstrapAPI] POST request for user", userId.substring(0, 8));

    // 2. Check idempotency flag in profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("journey_bootstrapped")
      .eq("id", userId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      console.error("[BootstrapAPI] Failed to check bootstrap flag:", profileError);
      // Continue anyway - don't block on this check
    }

    if (profile?.journey_bootstrapped === true) {
      console.log("[BootstrapAPI] Journey already bootstrapped for user", userId.substring(0, 8));
      return NextResponse.json({
        ok: true,
        alreadyBootstrapped: true,
        message: "Journey plan already exists for this user",
      });
    }

    // 3. Double-check with existing plan query (belt and suspenders)
    const existingPlan = await hasExistingPlan();
    if (existingPlan) {
      console.log("[BootstrapAPI] Avatar-sourced plan already exists, marking flag and returning");

      // Mark as bootstrapped
      await supabase
        .from("profiles")
        .update({ journey_bootstrapped: true })
        .eq("id", userId);

      // Fetch existing plan summary
      const { data: chapters } = await supabase
        .from("journey_chapters")
        .select("id, title, subtitle, order_index, metadata")
        .contains("metadata", { source: "avatar" })
        .order("order_index");

      const { data: nodes } = await supabase
        .from("journey_nodes")
        .select("id")
        .in("chapter_id", chapters?.map(c => c.id) || []);

      return NextResponse.json({
        ok: true,
        alreadyBootstrapped: true,
        existing: true,
        data: {
          userId,
          personaKey: chapters?.[0]?.metadata?.persona_key || "unknown",
          chapters: chapters?.map(c => ({
            id: c.id,
            title: c.title,
            subtitle: c.subtitle,
            order: c.order_index,
          })) || [],
          taskCount: nodes?.length || 0,
        },
      });
    }

    // 4. Fetch user's avatar from new avatars table
    const { data: avatar, error: avatarError } = await supabase
      .from("avatars")
      .select("user_id, gender, goal, diet, frequency, experience")
      .eq("user_id", userId)
      .single();

    if (avatarError || !avatar) {
      console.error("[BootstrapAPI] No avatar found for user", userId.substring(0, 8), avatarError);
      return NextResponse.json(
        { ok: false, error: "no_avatar", message: "Avatar required. Create avatar first via signup flow." },
        { status: 400 }
      );
    }

    // Normalize persona from avatar
    const persona: Persona = normalizePersona({
      gender: avatar.gender,
      goal: avatar.goal,
      diet: avatar.diet,
      frequency: avatar.frequency,
      experience: avatar.experience,
    });

    const personaKey = `${persona.gender}_${persona.goal}_${persona.diet}`;
    console.log("[BootstrapAPI] Building plan for persona:", personaKey, persona);

    // 5. Build personalized journey plan from persona
    const journeyPlan = buildJourneyFromPersona(persona);

    console.log("[BootstrapAPI] Journey plan generated:", {
      persona: personaKey,
      chapters: journeyPlan.chapters.length,
      nodes: journeyPlan.nodes.length,
    });

    // 6. Persist chapters to journey_chapters table
    // Generate deterministic UUIDs for chapters (ensures idempotency)
    const chapterIdMap = new Map<string, string>();
    const chaptersToInsert = journeyPlan.chapters.map((chapter, idx) => {
      const chapterUUID = deterministicUUID(personaKey, `chapter_${chapter.id}`);
      chapterIdMap.set(chapter.id, chapterUUID);

      return {
        id: chapterUUID,
        title: chapter.name,
        subtitle: "", // JourneyChapter doesn't have description field
        slug: `avatar-${chapter.id}`, // Prefix with 'avatar-' to avoid conflicts with seed slugs
        order_index: idx + 1,
        metadata: {
          source: "avatar",
          persona_key: personaKey,
          persona: persona,
          chapter_key: chapter.id, // Store original key for reference
          created_at: new Date().toISOString(),
        },
      };
    });

    const { data: insertedChapters, error: chaptersError } = await supabase
      .from("journey_chapters")
      .upsert(chaptersToInsert, { onConflict: "id" })
      .select();

    if (chaptersError) {
      console.error("[BootstrapAPI] Failed to insert chapters:", chaptersError);
      return NextResponse.json(
        { ok: false, error: "db_error", message: "Failed to persist journey chapters" },
        { status: 500 }
      );
    }

    console.log("[BootstrapAPI] Persisted", insertedChapters.length, "chapters");

    // 7. Persist nodes to journey_nodes table
    // Generate deterministic UUIDs for nodes and map chapter IDs
    const nodesToInsert = journeyPlan.nodes.map((node, idx) => {
      const nodeUUID = deterministicUUID(personaKey, `node_${node.id}`);
      const chapterUUID = chapterIdMap.get(node.chapter_id);

      if (!chapterUUID) {
        console.error("[BootstrapAPI] No UUID mapping for chapter_id:", node.chapter_id);
        throw new Error(`Chapter ID mapping missing for ${node.chapter_id}`);
      }

      return {
        id: nodeUUID,
        chapter_id: chapterUUID,
        title: node.title,
        description: node.description || "",
        type: node.type || null,
        order_index: idx + 1,
        points_reward: node.points || 10,
        conditions_json: node.metadata || {},
        cta_route: null, // JourneyNode doesn't have cta_route field in builder
      };
    });

    const { data: insertedNodes, error: nodesError } = await supabase
      .from("journey_nodes")
      .upsert(nodesToInsert, { onConflict: "id" })
      .select();

    if (nodesError) {
      console.error("[BootstrapAPI] Failed to insert nodes:", nodesError);
      return NextResponse.json(
        { ok: false, error: "db_error", message: "Failed to persist journey nodes" },
        { status: 500 }
      );
    }

    console.log("[BootstrapAPI] Persisted", insertedNodes.length, "nodes");

    // 8. Mark journey as bootstrapped in profiles
    const { error: flagError } = await supabase
      .from("profiles")
      .update({ journey_bootstrapped: true })
      .eq("id", userId);

    if (flagError) {
      console.error("[BootstrapAPI] Failed to set bootstrap flag:", flagError);
      // Don't fail the request - flag is just for optimization
    } else {
      console.log("[BootstrapAPI] Bootstrap flag set for user", userId.substring(0, 8));
    }

    // 9. Initialize user progress for first node as ACTIVE
    if (insertedNodes && insertedNodes.length > 0) {
      const firstNode = insertedNodes[0];

      await supabase
        .from("user_progress")
        .upsert({
          user_id: userId,
          node_id: firstNode.id,
          state: "ACTIVE",
          progress_json: {},
        }, { onConflict: "user_id,node_id" });

      console.log("[BootstrapAPI] Initialized first node as ACTIVE:", firstNode.id);
    }

    // 10. Return plan summary
    return NextResponse.json({
      ok: true,
      alreadyBootstrapped: false,
      existing: false,
      data: {
        userId,
        personaKey,
        persona,
        chapters: insertedChapters.map(c => ({
          id: c.id,
          title: c.title,
          subtitle: c.subtitle,
          order: c.order_index,
        })),
        taskCount: insertedNodes.length,
      },
    });

  } catch (err: any) {
    console.error("[BootstrapAPI] Fatal error:", err?.message, err?.stack);
    return handleApiError(err, 'JourneyPlanBootstrap');
  }
}
