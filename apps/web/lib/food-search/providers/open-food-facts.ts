/**
 * Open Food Facts Provider
 * International food database with barcode and text search
 * API: https://world.openfoodfacts.org/
 */

import type { FoodProvider, ProviderResult, Per100g } from './base';

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const TIMEOUT_MS = 10000;

interface OFFProduct {
  product_name?: string;
  product_name_he?: string;
  brands?: string;
  image_url?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kj_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;  // grams
  };
  code?: string;  // barcode
}

interface OFFSearchResponse {
  products?: OFFProduct[];
  count?: number;
}

export class OpenFoodFactsProvider implements FoodProvider {
  name = 'open_food_facts';

  /**
   * Support all queries (international database)
   */
  supports(query: string): boolean {
    return query.length >= 2;
  }

  /**
   * Search Open Food Facts database
   */
  async search(query: string, limit: number): Promise<ProviderResult[]> {
    try {
      const url = new URL(OFF_SEARCH_URL);
      url.searchParams.set('search_terms', query);
      url.searchParams.set('search_simple', '1');
      url.searchParams.set('action', 'process');
      url.searchParams.set('json', '1');
      url.searchParams.set('page_size', String(Math.min(limit, 50)));
      url.searchParams.set('fields', 'product_name,product_name_he,brands,image_url,nutriments,code');

      console.log('[OpenFoodFactsProvider] Searching:', query);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'User-Agent': 'FitJourney-Nutrition-App/1.0',
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('[OpenFoodFactsProvider] HTTP error:', response.status);
        return [];
      }

      const data: OFFSearchResponse = await response.json();

      if (!data.products || data.products.length === 0) {
        console.log('[OpenFoodFactsProvider] No results found');
        return [];
      }

      console.log(`[OpenFoodFactsProvider] Found ${data.products.length} products`);

      // Convert to ProviderResult format
      const results: ProviderResult[] = [];

      for (const product of data.products) {
        const converted = this.convertToProviderResult(product);
        if (converted) {
          results.push(converted);
        }
      }

      return results;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[OpenFoodFactsProvider] Request timeout');
      } else {
        console.error('[OpenFoodFactsProvider] Search error:', error);
      }
      return [];
    }
  }

  /**
   * Convert OFF product to ProviderResult
   */
  private convertToProviderResult(product: OFFProduct): ProviderResult | null {
    try {
      // Extract product name (prefer Hebrew, fallback to English)
      const name = product.product_name_he || product.product_name;
      if (!name || name.trim().length === 0) {
        return null;  // Skip products without names
      }

      // Extract nutrition data
      const nutriments = product.nutriments || {};

      // Energy (prefer kcal, convert from kJ if needed)
      let kcal = nutriments['energy-kcal_100g'] || 0;
      if (kcal === 0 && nutriments['energy-kj_100g']) {
        kcal = Math.round(nutriments['energy-kj_100g'] * 0.239);  // kJ to kcal
      }

      // Macros
      const protein_g = nutriments.proteins_100g || 0;
      const carbs_g = nutriments.carbohydrates_100g || 0;
      const fat_g = nutriments.fat_100g || 0;

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
      if (nutriments.fiber_100g) {
        per100g.fiber_g = Math.round(nutriments.fiber_100g * 10) / 10;
      }
      if (nutriments.sugars_100g) {
        per100g.sugar_g = Math.round(nutriments.sugars_100g * 10) / 10;
      }
      if (nutriments.sodium_100g) {
        // Convert grams to milligrams
        per100g.sodium_mg = Math.round(nutriments.sodium_100g * 1000);
      }

      return {
        id: product.code || `off_${Date.now()}_${Math.random()}`,
        name: name.trim(),
        name_he: product.product_name_he?.trim(),
        brand: product.brands?.trim(),
        per100g,
        imageUrl: product.image_url,
      };
    } catch (error) {
      console.error('[OpenFoodFactsProvider] Conversion error:', error);
      return null;
    }
  }
}
