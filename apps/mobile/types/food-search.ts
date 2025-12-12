/**
 * Food Search Types for Mobile App
 * Matches the backend API response structure
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

export interface ServingOption {
  id: string;
  label: string;
  grams: number;
  isDefault?: boolean;
  nutrition: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

export interface FoodSearchResult {
  id: string;
  source: 'israeli_moh' | 'open_food_facts' | 'usda' | 'user';
  name: string;
  name_he?: string;
  brand?: string;
  per100g: Per100g;
  servings: ServingOption[];
  defaultServing: string;
  imageUrl?: string;
  isPartial?: boolean;
  lastUsed?: string;
}

export interface FoodSearchResponse {
  ok: boolean;
  results: {
    recent: FoodSearchResult[];
    database: FoodSearchResult[];
  };
  sources: string[];
}

export interface FoodSearchRequest {
  query: string;
  limit?: number;
  includeRecent?: boolean;
}
