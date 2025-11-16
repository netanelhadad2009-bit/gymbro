import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { progressCache, cacheKeys } from "@/lib/journey/cache";

export const dynamic = "force-dynamic";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  "Pragma": "no-cache",
  "Expires": "0",
};

/**
 * GET /api/journey
 *
 * Returns the complete journey structure with user progress.
 * - If not authenticated: returns empty structure with auth:false
 * - If authenticated: returns full journey with user's progress state
 * - Supports optional ?chapter_id=<uuid> or ?chapter_slug=<slug> to filter nodes
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapter_id');
    const chapterSlug = searchParams.get('chapter_slug');

    console.log("[JourneyAPI] GET /api/journey - Start", { chapterId, chapterSlug });

    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.error("[JourneyAPI] Auth error:", authError.message);
      return NextResponse.json(
        { ok: false, error: "AuthError", message: authError.message },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // Not authenticated - return empty structure
    if (!session?.user) {
      console.log("[JourneyAPI] No session - returning empty structure");
      return NextResponse.json(
        {
          ok: true,
          auth: false,
          data: {
            chapters: [],
            nodes: [],
            total_points: 0,
            total_badges: 0
          }
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    const userId = session.user.id;
    console.log("[JourneyAPI] Authenticated user:", userId.substring(0, 8));

    // Check cache first (unless specific chapter filter is requested)
    if (!chapterId && !chapterSlug) {
      const cacheKey = cacheKeys.journey(userId);
      const cached = progressCache.get<any>(cacheKey);
      if (cached) {
        console.log("[JourneyAPI] Returning cached journey data");
        return NextResponse.json(cached, { headers: NO_CACHE_HEADERS });
      }
    }

    // 1. Check if there are avatar-sourced chapters (personalized journey)
    const { data: avatarChapters } = await supabase
      .from("journey_chapters")
      .select("id")
      .contains("metadata", { source: "avatar" })
      .limit(1);

    const hasAvatarChapters = avatarChapters && avatarChapters.length > 0;

    // 2. Get list of chapter IDs to show (either avatar or seed)
    let validChapterIds: string[] = [];

    if (hasAvatarChapters) {
      console.log("[JourneyAPI] Avatar chapters detected - filtering to avatar-only");
      const { data: avatarChapterList } = await supabase
        .from("journey_chapters")
        .select("id")
        .contains("metadata", { source: "avatar" });

      validChapterIds = avatarChapterList?.map(c => c.id) || [];
      console.log("[JourneyAPI] Valid avatar chapter IDs:", validChapterIds.length);
    } else {
      console.log("[JourneyAPI] No avatar chapters - showing seed chapters");
      const { data: seedChapterList } = await supabase
        .from("journey_chapters")
        .select("id")
        .contains("metadata", { source: "seed" });

      validChapterIds = seedChapterList?.map(c => c.id) || [];
      console.log("[JourneyAPI] Valid seed chapter IDs:", validChapterIds.length);
    }

    // 3. Fetch chapter status for user (all chapters first, then filter)
    const { data: chapterStatus, error: chapterError } = await supabase
      .from("v_user_chapter_status")
      .select("*")
      .eq("user_id", userId)
      .order("order_index");

    let chapters = chapterStatus || [];

    // Filter chapters to only valid chapter IDs (avatar OR seed, not both)
    if (validChapterIds.length > 0) {
      chapters = chapters.filter(ch => validChapterIds.includes(ch.chapter_id));
      console.log("[JourneyAPI] Filtered to", chapters.length, "chapters from", chapterStatus?.length || 0, "total");
    }

    // Fallback: If no chapters returned (new user with no progress), synthesize from valid chapters
    if (!chapters.length || chapterError) {
      if (chapterError) {
        console.error("[JourneyAPI] Chapter status error:", chapterError.message);
      }
      console.log("[JourneyAPI] No chapter status found, falling back to base chapters");

      // Fetch only valid chapters (filtered by source)
      let baseQuery = supabase
        .from("journey_chapters")
        .select("id, slug, title, order_index, metadata")
        .order("order_index");

      if (validChapterIds.length > 0) {
        baseQuery = baseQuery.in("id", validChapterIds);
      }

      const { data: baseChapters, error: baseError } = await baseQuery;

      if (baseError) {
        console.error("[JourneyAPI] Base chapters error:", baseError.message);
      } else {
        chapters = (baseChapters || []).map(c => ({
          user_id: userId,
          chapter_id: c.id,
          chapter_slug: c.slug,
          chapter_name: c.title,
          order_index: c.order_index,
          completed_nodes: 0,
          total_nodes: 0,
          chapter_state: "LOCKED" as const
        }));
        console.log("[JourneyAPI] Synthesized", chapters.length, "locked chapters (source:", hasAvatarChapters ? "avatar" : "seed", ")");
      }
    }

    // 4. Fetch nodes with optional chapter filter
    let nodesQuery = supabase
      .from("journey_nodes")
      .select(`
        *,
        chapter:journey_chapters(id, title, slug, order_index)
      `)
      .order("order_index");

    // Filter by valid chapter IDs (avatar or seed, not both)
    if (validChapterIds.length > 0) {
      nodesQuery = nodesQuery.in("chapter_id", validChapterIds);
      console.log("[JourneyAPI] Filtering nodes to", validChapterIds.length, "chapters");
    }

    // Validate requested chapter_id is in valid list
    if (chapterId) {
      if (validChapterIds.length === 0 || validChapterIds.includes(chapterId)) {
        nodesQuery = nodesQuery.eq("chapter_id", chapterId);
        console.log("[JourneyAPI] Further filtering to chapter_id:", chapterId.substring(0, 8));
      } else {
        console.warn("[JourneyAPI] Requested chapter_id", chapterId.substring(0, 8), "not in valid chapters - returning empty result");
        // Return empty result to force client to refresh with valid chapters
        return NextResponse.json(
          {
            ok: true,
            auth: true,
            data: {
              chapters: chapters,
              nodes: [],
              total_points: 0,
              total_badges: 0,
              selected_chapter_id: chapterId,
              selected_chapter_slug: null,
              message: "Invalid chapter requested - no nodes available"
            }
          },
          { headers: NO_CACHE_HEADERS }
        );
      }
    } else if (chapterSlug) {
      // Join with chapters to filter by slug
      nodesQuery = nodesQuery.eq("chapter.slug", chapterSlug);
    }

    const { data: nodes, error: nodesError } = await nodesQuery;

    if (nodesError) {
      console.error("[JourneyAPI] Nodes error:", nodesError.message);
      return NextResponse.json(
        { ok: false, error: "DatabaseError", message: nodesError.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // 5. Fetch user progress for these nodes
    const nodeIds = nodes?.map(n => n.id) || [];
    const { data: progress, error: progressError } = await supabase
      .from("user_progress")
      .select("*")
      .eq("user_id", userId)
      .in("node_id", nodeIds);

    if (progressError) {
      console.error("[JourneyAPI] Progress error:", progressError.message);
    }

    // 6. Fetch total points
    const { data: pointsData, error: pointsError } = await supabase
      .from("user_points")
      .select("points")
      .eq("user_id", userId);

    const totalPoints = pointsData?.reduce((sum, p) => sum + (p.points || 0), 0) || 0;

    // 7. Fetch total badges
    const { data: badgesData, error: badgesError } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", userId);

    const totalBadges = badgesData?.length || 0;

    // 8. Merge nodes with progress
    const nodesWithProgress = nodes?.map(node => {
      const nodeProgress = progress?.find(p => p.node_id === node.id);
      return {
        ...node,
        progress: nodeProgress || {
          state: "LOCKED",
          progress_json: {},
          completed_at: null
        }
      };
    }) || [];

    const duration = Date.now() - startTime;
    console.log("[JourneyAPI] Success:", {
      userId: userId.substring(0, 8),
      source: hasAvatarChapters ? "avatar" : "seed",
      chapters: chapters.length,
      chapterTitles: chapters.map(c => c.chapter_name),
      nodes: nodesWithProgress.length,
      totalPoints,
      totalBadges,
      filtered: !!(chapterId || chapterSlug),
      duration: `${duration}ms`
    });

    const responseData = {
      ok: true,
      auth: true,
      data: {
        chapters: chapters,
        nodes: nodesWithProgress,
        total_points: totalPoints,
        total_badges: totalBadges,
        selected_chapter_id: chapterId || null,
        selected_chapter_slug: chapterSlug || null
      }
    };

    // Cache the response (only for unfiltered queries)
    if (!chapterId && !chapterSlug) {
      const cacheKey = cacheKeys.journey(userId);
      progressCache.set(cacheKey, responseData);
    }

    return NextResponse.json(
      responseData,
      { headers: NO_CACHE_HEADERS }
    );

  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error("[JourneyAPI] Fatal error:", {
      message: err?.message,
      duration: `${duration}ms`
    });

    return NextResponse.json(
      {
        ok: false,
        error: "ServerError",
        message: err?.message || "Unknown error"
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
