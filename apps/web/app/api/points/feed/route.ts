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
import { requireAuth, checkRateLimit, validateSearchParams, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Query params validation schema
const PointsFeedQuerySchema = z.object({
  stageId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional().default(DEFAULT_LIMIT),
});

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

    // Rate limiting check (STANDARD - read operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'points-feed-get',
    });

    if (!rateLimit.allowed) {
      console.log('[PointsFeed] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const userId = user.id;

    // Validate query params
    const paramsValidation = validateSearchParams(request, PointsFeedQuerySchema);
    if (!paramsValidation.success) {
      return paramsValidation.response;
    }
    const { stageId, cursor, limit: rawLimit } = paramsValidation.data;
    const limit = rawLimit ?? DEFAULT_LIMIT;

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
  } catch (error) {
    console.error('[PointsFeed] Fatal error:', error);
    return handleApiError(error, 'PointsFeed');
  }
}
