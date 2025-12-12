/**
 * USDA FoodData Central Provider
 * US government nutrition database with comprehensive food data
 * API: https://fdc.nal.usda.gov/
 * Requires API key from: https://fdc.nal.usda.gov/api-key-signup.html
 */

import type { FoodProvider, ProviderResult, Per100g } from './base';

const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const TIMEOUT_MS = 10000;

// USDA nutrient IDs mapping
const NUTRIENT_IDS = {
  ENERGY_KCAL: 1008,
  PROTEIN: 1003,
  CARBOHYDRATE: 1005,
  FAT: 1004,
  FIBER: 1079,
  SUGARS: 2000,
  SODIUM: 1093,
} as const;

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  dataType: string;
  foodNutrients: USDANutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

interface USDASearchResponse {
  foods?: USDAFood[];
  totalHits?: number;
  currentPage?: number;
}

export class USDAProvider implements FoodProvider {
  name = 'usda';

  /**
   * Support all queries (US/international database)
   */
  supports(query: string): boolean {
    return query.length >= 2;
  }

  /**
   * Search USDA FoodData Central
   */
  async search(query: string, limit: number): Promise<ProviderResult[]> {
    const apiKey = process.env.USDA_API_KEY;

    if (!apiKey) {
      console.warn('[USDAProvider] USDA_API_KEY not configured, skipping');
      return [];
    }

    try {
      const url = new URL(USDA_API_URL);
      url.searchParams.set('query', query);
      url.searchParams.set('dataType', 'SR Legacy'); // Only SR Legacy has consistent macronutrient data
      url.searchParams.set('pageSize', String(Math.min(limit, 50)));
      url.searchParams.set('api_key', apiKey);

      console.log('[USDAProvider] Searching:', query);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[USDAProvider] HTTP error:', response.status);
        return [];
      }

      const data: USDASearchResponse = await response.json();

      if (!data.foods || data.foods.length === 0) {
        console.log('[USDAProvider] No results found');
        return [];
      }

      console.log(`[USDAProvider] Found ${data.foods.length} foods`);

      // Convert to ProviderResult format
      const results: ProviderResult[] = [];

      for (const food of data.foods) {
        const converted = this.convertToProviderResult(food);
        if (converted) {
          results.push(converted);
        }
      }

      return results;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[USDAProvider] Request timeout');
      } else {
        console.error('[USDAProvider] Search error:', error);
      }
      return [];
    }
  }

  /**
   * Convert USDA food to ProviderResult
   */
  private convertToProviderResult(food: USDAFood): ProviderResult | null {
    try {
      // Extract food name
      const name = food.description?.trim();
      if (!name || name.length === 0) {
        return null;
      }

      // Extract brand (if available)
      const brand = food.brandOwner || food.brandName;

      // Build nutrient map for easy lookup
      const nutrients = new Map<number, number>();
      for (const nutrient of food.foodNutrients || []) {
        nutrients.set(nutrient.nutrientId, nutrient.value);
      }

      // Extract nutrition values per 100g
      // USDA provides values per 100g by default for SR Legacy and Foundation
      const kcal = nutrients.get(NUTRIENT_IDS.ENERGY_KCAL) || 0;
      const protein_g = nutrients.get(NUTRIENT_IDS.PROTEIN) || 0;
      const carbs_g = nutrients.get(NUTRIENT_IDS.CARBOHYDRATE) || 0;
      const fat_g = nutrients.get(NUTRIENT_IDS.FAT) || 0;

      // Skip if completely missing nutrition data
      if (kcal === 0 && protein_g === 0 && carbs_g === 0 && fat_g === 0) {
        return null;
      }

      const per100g: Per100g = {
        kcal: Math.round(kcal),
        protein_g: Math.round(protein_g * 10) / 10,
        carbs_g: Math.round(carbs_g * 10) / 10,
        fat_g: Math.round(fat_g * 10) / 10,
      };

      // Optional nutrients
      const fiber_g = nutrients.get(NUTRIENT_IDS.FIBER);
      if (fiber_g) {
        per100g.fiber_g = Math.round(fiber_g * 10) / 10;
      }

      const sugar_g = nutrients.get(NUTRIENT_IDS.SUGARS);
      if (sugar_g) {
        per100g.sugar_g = Math.round(sugar_g * 10) / 10;
      }

      const sodium_mg = nutrients.get(NUTRIENT_IDS.SODIUM);
      if (sodium_mg) {
        // USDA provides sodium in mg
        per100g.sodium_mg = Math.round(sodium_mg);
      }

      // Extract serving size if available (convert to grams)
      let servingSizeGrams: number | undefined;
      if (food.servingSize && food.servingSizeUnit) {
        const unit = food.servingSizeUnit.toLowerCase();
        if (unit === 'g' || unit === 'grams') {
          servingSizeGrams = food.servingSize;
        } else if (unit === 'ml' || unit === 'milliliters') {
          // Approximate: 1ml ≈ 1g for most liquids
          servingSizeGrams = food.servingSize;
        }
      }

      return {
        id: String(food.fdcId),
        name: name,
        brand: brand?.trim(),
        per100g,
        servingSizeGrams,
      };
    } catch (error) {
      console.error('[USDAProvider] Conversion error:', error);
      return null;
    }
  }
}
