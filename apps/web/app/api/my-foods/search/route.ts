/**
 * My Foods Search API
 * GET /api/my-foods/search?q=...&limit=50
 *
 * Returns user's manually added foods + recently logged foods
 * Ranked by recency and usage frequency
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeHeName,
  tokenizeHe,
  calculateScore,
} from '@/lib/nutrition/hebrew-search';
import type { MyFoodResult } from '@/types/my-foods';

interface UserFood {
  id: string;
  name_he: string;
  brand: string | null;
  per_100g: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  created_at: string;
}

interface MealSummary {
  meal_id: string;  // Most recent meal ID
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  last_used: string;
  usage_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('[MyFoodsSearch] Auth error:', authError?.message || 'No session');
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    console.log('[MyFoodsSearch] Query:', query, 'Limit:', limit);

    // 1. Fetch user's manually added foods
    const { data: userFoods, error: userFoodsError } = await supabase
      .from('user_foods')
      .select('id, name_he, brand, per_100g, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (userFoodsError) {
      console.error('[MyFoodsSearch] user_foods error:', userFoodsError);
      throw userFoodsError;
    }

    // 2. Fetch recently logged meals (aggregated by name for usage stats)
    // We'll get distinct meal names with count and most recent usage
    const { data: recentMeals, error: mealsError } = await supabase
      .from('meals')
      .select('id, name, calories, protein, carbs, fat, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200); // Get more to aggregate

    if (mealsError) {
      console.error('[MyFoodsSearch] meals error:', mealsError);
      throw mealsError;
    }

    // Aggregate meals by name
    const mealMap = new Map<string, MealSummary>();
    (recentMeals || []).forEach((meal) => {
      const existing = mealMap.get(meal.name);
      if (existing) {
        existing.usage_count += 1;
        // Keep the most recent timestamp and meal ID
        if (new Date(meal.created_at) > new Date(existing.last_used)) {
          existing.meal_id = meal.id;
          existing.last_used = meal.created_at;
          // Update macros to most recent values
          existing.calories = meal.calories;
          existing.protein = meal.protein;
          existing.carbs = meal.carbs;
          existing.fat = meal.fat;
        }
      } else {
        mealMap.set(meal.name, {
          meal_id: meal.id,
          name: meal.name,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat,
          last_used: meal.created_at,
          usage_count: 1,
        });
      }
    });

    // Convert to results array
    const results: Array<MyFoodResult & { _score?: number; _timestamp?: number }> = [];

    // Add manually added foods
    (userFoods || []).forEach((food: UserFood) => {
      results.push({
        id: food.id,
        source: 'manual',
        name_he: food.name_he,
        brand: food.brand,
        calories_per_100g: food.per_100g.kcal,
        protein_g_per_100g: food.per_100g.protein_g,
        carbs_g_per_100g: food.per_100g.carbs_g,
        fat_g_per_100g: food.per_100g.fat_g,
        last_used_at: food.created_at,
        usage_count: 1,
        _timestamp: new Date(food.created_at).getTime(),
      });
    });

    // Add logged meals
    mealMap.forEach((meal) => {
      results.push({
        id: `logged-${normalizeHeName(meal.name)}`,
        source: 'logged',
        name_he: meal.name,
        calories_per_100g: meal.calories, // Note: these are actual consumed amounts, not per-100g
        protein_g_per_100g: meal.protein,
        carbs_g_per_100g: meal.carbs,
        fat_g_per_100g: meal.fat,
        last_used_at: meal.last_used,
        usage_count: meal.usage_count,
        mealId: meal.meal_id,  // Most recent meal ID
        loggedAt: meal.last_used,
        _timestamp: new Date(meal.last_used).getTime(),
      });
    });

    console.log('[MyFoodsSearch] Total results before filtering:', results.length);

    // 3. Apply search query if provided
    let filteredResults = results;
    if (query && query.trim().length >= 2) {
      const normalizedQuery = normalizeHeName(query);
      const queryTokens = tokenizeHe(query);

      filteredResults = results
        .map((food) => {
          const score = calculateScore(food.name_he, undefined, query).score;
          return { ...food, _score: score };
        })
        .filter((food) => food._score > 0);

      // Sort by score DESC, then by timestamp DESC
      filteredResults.sort((a, b) => {
        if (a._score !== b._score) return b._score! - a._score!;
        return (b._timestamp || 0) - (a._timestamp || 0);
      });

      console.log('[MyFoodsSearch] Filtered results:', filteredResults.length);
      console.log(
        '[MyFoodsSearch] Top 5:',
        filteredResults.slice(0, 5).map((r) => `${r.name_he} (score=${r._score})`)
      );
    } else {
      // No query: sort by recency and usage
      filteredResults.sort((a, b) => {
        // First by usage count
        if ((b.usage_count || 0) !== (a.usage_count || 0)) {
          return (b.usage_count || 0) - (a.usage_count || 0);
        }
        // Then by recency
        return (b._timestamp || 0) - (a._timestamp || 0);
      });

      console.log('[MyFoodsSearch] No query - sorted by usage & recency');
    }

    // 4. Limit results
    const finalResults = filteredResults.slice(0, limit);

    // Remove internal fields
    const cleanResults = finalResults.map(({ _score, _timestamp, ...rest }) => rest);

    console.log('[MyFoodsSearch] Returning', cleanResults.length, 'results');

    return NextResponse.json({
      ok: true,
      results: cleanResults,
      count: cleanResults.length,
    });
  } catch (error: any) {
    console.error('[MyFoodsSearch] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
