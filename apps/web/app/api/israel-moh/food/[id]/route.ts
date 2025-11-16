/**
 * Israeli MoH Food Details API
 * GET /api/israel-moh/food/[id]
 *
 * Fetch a single food item by ID from the Israeli Ministry of Health database
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const foodId = params.id;

    if (!foodId || isNaN(parseInt(foodId))) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid food ID',
        },
        { status: 400 }
      );
    }

    console.log('[FoodDetails] Fetching food ID:', foodId);

    const supabase = await createClient();

    // Fetch the food item
    const { data: food, error } = await supabase
      .from('israel_moh_foods')
      .select(
        'id, name_he, name_en, brand, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugars_g_per_100g, sodium_mg_per_100g, fiber_g_per_100g, is_partial'
      )
      .eq('id', parseInt(foodId))
      .single();

    if (error) {
      console.error('[FoodDetails] Database error:', error);

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

    console.log('[FoodDetails] Found food:', food.name_he);

    return NextResponse.json(
      {
        ok: true,
        food,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: any) {
    console.error('[FoodDetails] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
