/**
 * Single Meal API
 * GET /api/meals/[id]
 *
 * Fetch a single logged meal by ID for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';
import { logger, logRateLimitViolation, sanitizeUserId } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Rate limiting check (STANDARD - read operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'meals-id-get',
    });

    if (!rateLimit.allowed) {
      logRateLimitViolation({
        endpoint: '/api/meals/[id]',
        limit: rateLimit.limit,
        current: rateLimit.limit + 1,
      });
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const mealId = params.id;

    if (!mealId) {
      return ErrorResponses.badRequest('Invalid meal ID');
    }

    const userId = user.id;

    logger.debug('Fetching meal by ID', {
      userId: sanitizeUserId(userId),
      mealId,
      endpoint: '/api/meals/[id]',
    });

    // Fetch the meal
    const { data: meal, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .eq('user_id', userId) // Ensure user owns this meal
      .single();

    if (error) {
      logger.error('Database error fetching meal', {
        userId: sanitizeUserId(userId),
        mealId,
        errorCode: error.code,
        errorMessage: error.message,
      });

      if (error.code === 'PGRST116') {
        return ErrorResponses.notFound('Meal not found');
      }

      throw error;
    }

    if (!meal) {
      logger.warn('Meal not found', {
        userId: sanitizeUserId(userId),
        mealId,
      });
      return ErrorResponses.notFound('Meal not found');
    }

    logger.info('Meal retrieved successfully', {
      userId: sanitizeUserId(userId),
      mealId,
      mealName: meal.name,
    });

    return NextResponse.json(
      {
        ok: true,
        meal,
      },
      {
        headers: {
          'Cache-Control': 'no-store', // User-specific data, don't cache
        },
      }
    );
  } catch (error) {
    logger.error('Fatal error in meal details endpoint', {
      endpoint: '/api/meals/[id]',
      error: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error, 'MealDetails');
  }
}
