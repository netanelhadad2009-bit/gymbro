/**
 * Single Meal API
 * GET /api/meals/[id]
 *
 * Fetch a single logged meal by ID for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mealId = params.id;

    if (!mealId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid meal ID',
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Auth check
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('[MealDetails] Auth error:', authError?.message || 'No session');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

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
        return NextResponse.json(
          {
            ok: false,
            error: 'Meal not found',
          },
          { status: 404 }
        );
      }

      throw error;
    }

    if (!meal) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Meal not found',
        },
        { status: 404 }
      );
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
  } catch (error: any) {
    console.error('[MealDetails] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
