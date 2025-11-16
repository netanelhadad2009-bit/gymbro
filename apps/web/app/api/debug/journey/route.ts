import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/debug/journey
 *
 * Dev-only aggregation endpoint that returns a complete snapshot of the user's journey:
 * - Avatar assignment (key, confidence, reasons)
 * - All chapters with completion status
 * - All nodes with states and progress
 * - Total points and badges
 *
 * Used by the Journey Inspector UI for debugging and visualization.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // 1. Check if there are avatar-sourced chapters (personalized journey)
    const { data: avatarChapters } = await supabase
      .from("journey_chapters")
      .select("id")
      .contains("metadata", { source: "avatar" })
      .limit(1);

    const hasAvatarChapters = avatarChapters && avatarChapters.length > 0;
    console.log("[Debug/Journey] Has avatar chapters:", hasAvatarChapters);

    // 2. Get list of chapter IDs to show (either avatar or seed)
    let validChapterIds: string[] = [];

    if (hasAvatarChapters) {
      console.log("[Debug/Journey] Filtering to avatar-only chapters");
      const { data: avatarChapterList } = await supabase
        .from("journey_chapters")
        .select("id")
        .contains("metadata", { source: "avatar" });

      validChapterIds = avatarChapterList?.map(c => c.id) || [];
      console.log("[Debug/Journey] Valid avatar chapter IDs:", validChapterIds.length);
    } else {
      console.log("[Debug/Journey] Filtering to seed-only chapters");
      const { data: seedChapterList } = await supabase
        .from("journey_chapters")
        .select("id")
        .contains("metadata", { source: "seed" });

      validChapterIds = seedChapterList?.map(c => c.id) || [];
      console.log("[Debug/Journey] Valid seed chapter IDs:", validChapterIds.length);
    }

    // 3. Fetch avatar from new table
    const { data: avatar } = await supabase
      .from("avatars")
      .select("user_id, gender, goal, diet, frequency, experience, created_at")
      .eq("user_id", userId)
      .single();

    // 4. Fetch chapters with status (all chapters first, then filter)
    const { data: allChapterStatus } = await supabase
      .from("v_user_chapter_status")
      .select("*")
      .eq("user_id", userId)
      .order("order_index");

    // Filter to only valid chapter IDs (avatar OR seed, not both)
    const chapterStatus = validChapterIds.length > 0
      ? (allChapterStatus || []).filter(ch => validChapterIds.includes(ch.chapter_id))
      : (allChapterStatus || []);

    console.log("[Debug/Journey] Filtered chapters:", {
      before: allChapterStatus?.length || 0,
      after: chapterStatus.length,
      titles: chapterStatus.map(c => c.chapter_name)
    });

    // 5. Fetch nodes with progress (filtered by valid chapter IDs)
    let nodesQuery = supabase
      .from("journey_nodes")
      .select(`
        id,
        chapter_id,
        title,
        description,
        type,
        order_index,
        points_reward,
        conditions_json,
        cta_route,
        chapter:journey_chapters(id, title, slug, order_index)
      `)
      .order("order_index");

    // Filter by valid chapter IDs (avatar or seed, not both)
    if (validChapterIds.length > 0) {
      nodesQuery = nodesQuery.in("chapter_id", validChapterIds);
    }

    const { data: nodes } = await nodesQuery;

    // 4. Fetch user progress for all nodes
    const nodeIds = nodes?.map(n => n.id) || [];
    const { data: progress } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .in("node_id", nodeIds);

    // 5. Fetch total points
    const { data: pointsData } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", userId);

    const totalPoints = pointsData?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;

    // 6. Fetch total badges
    const { data: badgesData } = await supabase
      .from("user_badges")
      .select("id, badge_key, earned_at")
      .eq("user_id", userId);

    // 7. Merge nodes with progress and organize by chapter
    const nodesWithProgress = nodes?.map(node => {
      const nodeProgress = progress?.find(p => p.node_id === node.id);
      return {
        id: node.id,
        chapter_id: node.chapter_id,
        chapter_name: (node.chapter as any)?.title || "Unknown",
        chapter_slug: (node.chapter as any)?.slug || "",
        title: node.title,
        description: node.description,
        type: node.type,
        order_index: node.order_index,
        points_reward: node.points_reward,
        conditions_json: node.conditions_json,
        cta_route: node.cta_route,
        state: nodeProgress?.state || "LOCKED",
        progress_json: nodeProgress?.progress_json || {},
        completed_at: nodeProgress?.completed_at || null,
      };
    }) || [];

    // 8. Build response
    return NextResponse.json({
      userId,
      avatar: avatar ? {
        gender: avatar.gender,
        goal: avatar.goal,
        diet: avatar.diet,
        frequency: avatar.frequency,
        experience: avatar.experience,
        assigned_at: avatar.created_at,
      } : null,
      chapters: chapterStatus || [],
      nodes: nodesWithProgress,
      totalPoints,
      totalBadges: badgesData?.length || 0,
      badges: badgesData || [],
      meta: {
        at: new Date().toISOString(),
        source: hasAvatarChapters ? "avatar" : "seed",
        nodeCount: nodesWithProgress.length,
        chapterCount: chapterStatus?.length || 0,
        chapterTitles: (chapterStatus || []).map(c => c.chapter_name),
      },
    });

  } catch (err: any) {
    console.error("[DebugJourney] Fatal error:", err?.message);
    return NextResponse.json(
      { error: "ServerError", message: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
