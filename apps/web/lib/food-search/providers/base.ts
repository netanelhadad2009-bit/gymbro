/**
 * Base interfaces for food search providers
 * This abstraction allows easy addition of new food databases
 */

export interface Per100g {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
}

export interface ProviderResult {
  id: string;                    // Provider-specific ID
  name: string;                  // Food name (English preferred)
  name_he?: string;              // Hebrew name (if available)
  brand?: string;                // Brand/manufacturer
  per100g: Per100g;              // Normalized nutrition per 100g
  servingSizeGrams?: number;     // Default serving size if known
  imageUrl?: string;             // Product image
}

export interface FoodProvider {
  name: string;                                          // Provider identifier
  search(query: string, limit: number): Promise<ProviderResult[]>;  // Search foods
  supports(query: string): boolean;                      // Check if should query
}

/**
 * Check if nutrition data is incomplete
 */
export function isIncomplete(per100g: Per100g): boolean {
  return per100g.kcal === 0 || per100g.protein_g === 0 || per100g.carbs_g === 0 || per100g.fat_g === 0;
}

/**
 * Round to 1 decimal place
 */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Normalize name for deduplication
 */
export function normalizeForDedup(name: string, brand?: string): string {
  const normalized = name.toLowerCase().trim().replace(/\s+/g, ' ');
  return brand ? `${normalized}|${brand.toLowerCase().trim()}` : normalized;
}
