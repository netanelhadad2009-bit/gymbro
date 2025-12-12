/**
 * User Foods Provider
 * Searches user's custom foods and recent meals
 */

import { createClient } from '@/lib/supabase/server';
import type { FoodProvider, ProviderResult, Per100g } from './base';

const RECENT_DAYS = 30;
const MAX_RECENT = 20;

interface UserFoodRow {
  id: string;
  name_he: string;
  brand?: string;
  serving_grams: number;
  per_100g: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sugar_g?: number;
    sodium_mg?: number;
  };
  created_at: string;
}

interface MealRow {
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion_grams?: number;
  created_at: string;
}

export class UserFoodsProvider implements FoodProvider {
  name = 'user';

  constructor(private userId: string) {}

  /**
   * Support all queries for authenticated users
   */
  supports(query: string): boolean {
    return query.length >= 2 && !!this.userId;
  }

  /**
   * Search user's custom foods and recent meals
   */
  async search(query: string, limit: number): Promise<ProviderResult[]> {
    if (!this.userId) {
      return [];
    }

    try {
      const supabase = await createClient();
      const lowerQuery = query.toLowerCase();

      // Query 1: User's custom foods
      const { data: userFoods, error: userFoodsError } = await supabase
        .from('user_foods')
        .select('id, name_he, brand, serving_grams, per_100g, created_at')
        .eq('user_id', this.userId)
        .ilike('name_he', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userFoodsError) {
        console.error('[UserFoodsProvider] Error fetching user foods:', userFoodsError);
      }

      // Query 2: Recent meals (last 30 days)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - RECENT_DAYS);

      const { data: recentMeals, error: mealsError } = await supabase
        .from('meals')
        .select('name, brand, calories, protein, carbs, fat, portion_grams, created_at')
        .eq('user_id', this.userId)
        .gte('date', cutoffDate.toISOString().split('T')[0])
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(MAX_RECENT);

      if (mealsError) {
        console.error('[UserFoodsProvider] Error fetching recent meals:', mealsError);
      }

      // Convert to ProviderResult format
      const results: ProviderResult[] = [];

      // Add user foods
      if (userFoods) {
        for (const food of userFoods) {
          const converted = this.convertUserFoodToResult(food);
          if (converted) {
            results.push(converted);
          }
        }
      }

      // Add recent meals (deduplicate by name+brand)
      if (recentMeals) {
        const seen = new Set<string>();

        // Track user food names to avoid duplicates
        for (const result of results) {
          seen.add(this.getNormalizedKey(result.name, result.brand));
        }

        for (const meal of recentMeals) {
          const key = this.getNormalizedKey(meal.name, meal.brand);
          if (!seen.has(key)) {
            seen.add(key);
            const converted = this.convertMealToResult(meal);
            if (converted) {
              results.push(converted);
            }
          }
        }
      }

      return results.slice(0, limit);
    } catch (error) {
      console.error('[UserFoodsProvider] Search error:', error);
      return [];
    }
  }

  /**
   * Convert user_foods row to ProviderResult
   */
  private convertUserFoodToResult(food: UserFoodRow): ProviderResult | null {
    try {
      const per100g: Per100g = {
        kcal: Math.round(food.per_100g.kcal || 0),
        protein_g: Math.round((food.per_100g.protein_g || 0) * 10) / 10,
        carbs_g: Math.round((food.per_100g.carbs_g || 0) * 10) / 10,
        fat_g: Math.round((food.per_100g.fat_g || 0) * 10) / 10,
      };

      if (food.per_100g.fiber_g) {
        per100g.fiber_g = Math.round(food.per_100g.fiber_g * 10) / 10;
      }
      if (food.per_100g.sugar_g) {
        per100g.sugar_g = Math.round(food.per_100g.sugar_g * 10) / 10;
      }
      if (food.per_100g.sodium_mg) {
        per100g.sodium_mg = Math.round(food.per_100g.sodium_mg);
      }

      return {
        id: `user:${food.id}`,
        name: food.name_he,
        name_he: food.name_he,
        brand: food.brand,
        per100g,
        servingSizeGrams: food.serving_grams,
      };
    } catch (error) {
      console.error('[UserFoodsProvider] Error converting user food:', error);
      return null;
    }
  }

  /**
   * Convert meals row to ProviderResult
   * Calculate per100g from meal data (reverse calculation)
   */
  private convertMealToResult(meal: MealRow): ProviderResult | null {
    try {
      const portionGrams = meal.portion_grams || 100; // Default to 100g if not specified
      const factor = 100 / portionGrams;

      const per100g: Per100g = {
        kcal: Math.round(meal.calories * factor),
        protein_g: Math.round(meal.protein * factor * 10) / 10,
        carbs_g: Math.round(meal.carbs * factor * 10) / 10,
        fat_g: Math.round(meal.fat * factor * 10) / 10,
      };

      return {
        id: `recent:${Date.now()}_${Math.random()}`,
        name: meal.name,
        brand: meal.brand,
        per100g,
        servingSizeGrams: portionGrams,
      };
    } catch (error) {
      console.error('[UserFoodsProvider] Error converting meal:', error);
      return null;
    }
  }

  /**
   * Create normalized key for deduplication
   */
  private getNormalizedKey(name: string, brand?: string): string {
    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ');
    return brand
      ? `${normalizedName}|${brand.toLowerCase().trim()}`
      : normalizedName;
  }
}
