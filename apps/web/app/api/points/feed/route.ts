/**
 * GET /api/points/feed
 *
 * Returns paginated list of point events for the authenticated user
 * Query params:
 * - stageId?: filter by stage
 * - cursor?: pagination cursor (created_at timestamp)
 * - limit?: number of items (default 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

interface PointsFeedItem {
  id: string;
  points: number;
  reason: string;
  stageId: string | null;
  stageTitle: string | null;
  taskId: string | null;
  taskTitle: string | null;
  createdAt: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[PointsFeed] GET /api/points/feed - Start');

    // Auth check
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('[PointsFeed] Auth error:', authError?.message || 'No session');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const stageId = searchParams.get('stageId');
    const cursor = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');
    const limit = Math.min(
      limitParam ? parseInt(limitParam, 10) : DEFAULT_LIMIT,
      MAX_LIMIT
    );

    console.log('[PointsFeed] Query:', { stageId, cursor, limit });

    // Build query
    let query = supabase
      .from('user_points')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to determine if there are more

    // Apply stage filter
    if (stageId) {
      // Join with user_stage_tasks to filter by stage
      query = supabase
        .from('user_points')
        .select(`
          *,
          user_stage_tasks!inner (
            user_stage_id
          )
        `)
        .eq('user_id', userId)
        .eq('user_stage_tasks.user_stage_id', stageId)
        .order('created_at', { ascending: false })
        .limit(limit + 1);
    }

    // Apply cursor for pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: pointsRecords, error: pointsError } = await query;

    if (pointsError) {
      console.error('[PointsFeed] Error fetching points:', pointsError);
      throw new Error(`Failed to fetch points: ${pointsError.message}`);
    }

    // Determine if there are more results
    const hasMore = (pointsRecords?.length || 0) > limit;
    const items = pointsRecords?.slice(0, limit) || [];

    // Extract stage and task info from the reason field
    // Reason format: "השלמת: {taskTitle} ({stageTitle})"
    const feed: PointsFeedItem[] = items.map((record: any) => {
      // Try to parse stage/task titles from reason
      let stageTitle: string | null = null;
      let taskTitle: string | null = null;

      const reasonMatch = record.reason?.match(/השלמת:\s*(.+?)\s*\((.+?)\)/);
      if (reasonMatch) {
        taskTitle = reasonMatch[1];
        stageTitle = reasonMatch[2];
      }

      return {
        id: record.id,
        points: record.points,
        reason: record.reason,
        stageId: null, // We don't store this currently
        stageTitle,
        taskId: null, // We don't store this currently
        taskTitle,
        createdAt: record.created_at,
      };
    });

    // Next cursor is the created_at of the last item
    const nextCursor = hasMore && items.length > 0
      ? items[items.length - 1].created_at
      : null;

    console.log('[PointsFeed] Success:', {
      itemsReturned: feed.length,
      hasMore,
    });

    return NextResponse.json({
      ok: true,
      items: feed,
      nextCursor,
      hasMore,
    });
  } catch (err: any) {
    console.error('[PointsFeed] Fatal error:', {
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'ServerError',
        message: err?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
