/**
 * Barcode nutrition types for mobile app
 * Mirrors types from apps/web/types/barcode.ts
 */

// Nutrition per 100g
export type Per100g = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
};

// Data source
export type ProviderSource = 'off' | 'fatsecret' | 'israel_moh' | 'manual' | 'cache';

// Product data from barcode lookup API
export type BarcodeProduct = {
  barcode?: string;
  name: string;
  name_he?: string;
  brand?: string;
  per100g: Per100g;
  imageUrl?: string;
  source?: ProviderSource | 'not_found';
  serving_grams?: number;
  isPartial?: boolean;
};

// Lookup response (discriminated union)
export type BarcodeLookupResponse =
  | { ok: true; product: BarcodeProduct }
  | { ok: false; reason: BarcodeLookupError; message?: string };

export type BarcodeLookupError = 'not_found' | 'bad_barcode' | 'network' | 'timeout' | 'invalid';

// Meal type for logging
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
