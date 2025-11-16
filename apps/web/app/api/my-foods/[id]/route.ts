/**
 * Manual Food Details API
 * GET /api/my-foods/[id]
 *
 * Fetch a single manually added food item by ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const foodId = params.id;

    if (!foodId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid food ID',
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
      console.error('[ManualFoodDetails] Auth error:', authError?.message || 'No session');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    console.log('[ManualFoodDetails] Fetching food ID:', foodId);

    // Fetch the manual food item
    const { data: food, error } = await supabase
      .from('user_foods')
      .select('id, name_he, brand, serving_grams, per_100g, is_verified, created_at')
      .eq('id', foodId)
      .eq('user_id', userId) // Ensure user owns this food
      .single();

    if (error) {
      console.error('[ManualFoodDetails] Database error:', error);

      if (error.code === 'PGRST116') {
        return NextResponse.json(
          {
            ok: false,
            error: 'Food not found',
          },
          { status: 404 }
        );
      }

      throw error;
    }

    if (!food) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Food not found',
        },
        { status: 404 }
      );
    }

    console.log('[ManualFoodDetails] Found food:', food.name_he);

    // Get usage count (how many times this food has been logged)
    const { count: usageCount } = await supabase
      .from('meals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('name', food.name_he);

    console.log('[ManualFoodDetails] Usage count:', usageCount);

    // Transform to standard format
    const transformedFood = {
      id: food.id,
      name_he: food.name_he,
      name_en: null,
      brand: food.brand,
      category: null,
      calories_per_100g: food.per_100g.kcal,
      protein_g_per_100g: food.per_100g.protein_g,
      carbs_g_per_100g: food.per_100g.carbs_g,
      fat_g_per_100g: food.per_100g.fat_g,
      fiber_g_per_100g: null,
      sugars_g_per_100g: null,
      sodium_mg_per_100g: null,
      serving_grams: food.serving_grams,
      is_partial: false,
      is_verified: food.is_verified,
      created_at: food.created_at,
      usage_count: usageCount || 0,
    };

    return NextResponse.json(
      {
        ok: true,
        food: transformedFood,
      },
      {
        headers: {
          'Cache-Control': 'no-cache', // User-specific data, don't cache
        },
      }
    );
  } catch (error: any) {
    console.error('[ManualFoodDetails] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
