/**
 * Single Meal API
 * GET /api/meals/[id]
 *
 * Fetch a single logged meal by ID for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';

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
      console.log('[MealDetails] Rate limit exceeded');
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

    console.log('[MealDetails] Fetching meal ID:', mealId);

    // Fetch the meal
    const { data: meal, error } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .eq('user_id', userId) // Ensure user owns this meal
      .single();

    if (error) {
      console.error('[MealDetails] Database error:', error);

      if (error.code === 'PGRST116') {
        return ErrorResponses.notFound('Meal not found');
      }

      throw error;
    }

    if (!meal) {
      return ErrorResponses.notFound('Meal not found');
    }

    console.log('[MealDetails] Found meal:', meal.name);

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
    console.error('[MealDetails] Fatal error:', error);
    return handleApiError(error, 'MealDetails');
  }
}
