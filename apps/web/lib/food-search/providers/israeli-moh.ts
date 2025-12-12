/**
 * Israeli Ministry of Health Food Provider
 * Wrapper around existing Israeli MoH database search
 */

import { createClient } from '@/lib/supabase/server';
import {
  normalizeHeName,
  tokenizeHe,
  applySynonyms,
  rankFoodResults,
} from '@/lib/nutrition/hebrew-search';
import type { FoodProvider, ProviderResult, Per100g } from './base';

const MAX_DB_RESULTS = 100;

export class IsraeliMoHProvider implements FoodProvider {
  name = 'israeli_moh';

  /**
   * Always query Israeli MoH (especially for Hebrew queries)
   */
  supports(query: string): boolean {
    return query.length >= 2;
  }

  /**
   * Search Israeli MoH foods database
   */
  async search(query: string, limit: number): Promise<ProviderResult[]> {
    try {
      const supabase = await createClient();

      // Use Hebrew search utilities
      const normalizedQuery = normalizeHeName(query);
      const queryWithSynonyms = applySynonyms(query);
      const queryTokens = tokenizeHe(query);
      const firstToken = queryTokens[0] || normalizedQuery;

      // Multiple search strategies (parallel)
      const searchQueries = [
        // Exact match on normalized name
        supabase
          .from('israel_moh_foods')
          .select(
            'id, name_he, name_en, brand, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugars_g_per_100g, sodium_mg_per_100g, fiber_g_per_100g, is_partial'
          )
          .ilike('name_he', `%${normalizedQuery}%`)
          .limit(MAX_DB_RESULTS),

        // Search by first token if multi-word query
        ...(queryTokens.length > 1
          ? [
              supabase
                .from('israel_moh_foods')
                .select(
                  'id, name_he, name_en, brand, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugars_g_per_100g, sodium_mg_per_100g, fiber_g_per_100g, is_partial'
                )
                .ilike('name_he', `%${firstToken}%`)
                .limit(50),
            ]
          : []),

        // Search by synonym if different
        ...(queryWithSynonyms !== normalizedQuery
          ? [
              supabase
                .from('israel_moh_foods')
                .select(
                  'id, name_he, name_en, brand, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugars_g_per_100g, sodium_mg_per_100g, fiber_g_per_100g, is_partial'
                )
                .ilike('name_he', `%${queryWithSynonyms}%`)
                .limit(50),
            ]
          : []),
      ];

      // Execute in parallel
      const results = await Promise.all(searchQueries);

      // Combine and deduplicate
      const allResults: any[] = [];
      const seenIds = new Set<number>();

      for (const { data, error } of results) {
        if (error) {
          console.error('[IsraeliMoHProvider] Query error:', error);
          continue;
        }

        if (data) {
          for (const item of data) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              allResults.push(item);
            }
          }
        }
      }

      if (allResults.length === 0) {
        return [];
      }

      // Apply intelligent ranking
      const rankedResults = rankFoodResults(allResults, query);

      // Convert to ProviderResult format
      return rankedResults.slice(0, limit).map((item) => this.convertToProviderResult(item));
    } catch (error) {
      console.error('[IsraeliMoHProvider] Search error:', error);
      return [];
    }
  }

  /**
   * Convert Israeli MoH database row to ProviderResult
   */
  private convertToProviderResult(item: any): ProviderResult {
    const per100g: Per100g = {
      kcal: Math.round(item.calories_per_100g || 0),
      protein_g: Math.round((item.protein_g_per_100g || 0) * 10) / 10,
      carbs_g: Math.round((item.carbs_g_per_100g || 0) * 10) / 10,
      fat_g: Math.round((item.fat_g_per_100g || 0) * 10) / 10,
    };

    if (item.sugars_g_per_100g) {
      per100g.sugar_g = Math.round(item.sugars_g_per_100g * 10) / 10;
    }
    if (item.sodium_mg_per_100g) {
      per100g.sodium_mg = Math.round(item.sodium_mg_per_100g);
    }
    if (item.fiber_g_per_100g) {
      per100g.fiber_g = Math.round(item.fiber_g_per_100g * 10) / 10;
    }

    return {
      id: String(item.id),
      name: item.name_en || item.name_he || 'Unknown Food',
      name_he: item.name_he,
      brand: item.brand,
      per100g,
    };
  }
}
