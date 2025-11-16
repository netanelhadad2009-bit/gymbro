/**
 * Shared types for barcode nutrition system
 */

export type Per100g = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
};

export type ProviderSource = 'off' | 'fatsecret' | 'israel_moh' | 'manual' | 'cache';

export type BarcodeProduct = {
  barcode?: string; // Optional for manually added items
  name: string;
  name_he?: string; // Hebrew name (preferred for display in Israel)
  brand?: string;
  per100g: Per100g;
  imageUrl?: string;
  source?: ProviderSource | 'not_found';
  serving_grams?: number; // Optional default serving size
  isPartial?: boolean; // Indicates if nutrition data is incomplete
  matchMeta?: IsraelMoHMatchMeta; // Metadata for Israeli MoH matches
};

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type LogMealRequest = {
  barcode?: string;
  productName: string;
  brand?: string;
  grams: number;
  mealType?: MealType;
  per100g: Per100g;
};

export type ScanHistoryItem = {
  id: string;
  barcode: string;
  productName: string;
  brand?: string;
  scannedAt: string;
  product?: BarcodeProduct;
};

export type FavoriteFood = {
  id: string;
  barcode: string;
  note?: string;
  createdAt: string;
  product?: BarcodeProduct;
};

export type BarcodeError = 'bad_barcode' | 'not_found' | 'incomplete' | 'network' | 'permission';

export type ServingOption = {
  label: string;
  grams: number;
};

// Lookup result types (discriminated union)
export type LookupOk = {
  ok: true;
  product: BarcodeProduct;
  fromCache?: boolean;
};

export type LookupErrReason = 'not_found' | 'invalid' | 'network' | 'partial' | 'bad_barcode' | 'unknown';

export type LookupErr = {
  ok: false;
  reason: LookupErrReason;
  message: string;
  status?: number;
};

export type LookupResult = LookupOk | LookupErr;

// User-created food product
export type UserFood = {
  id: string;
  user_id: string;
  barcode?: string;
  name_he: string;
  brand?: string;
  serving_grams: number;
  per_100g: Per100g;
  is_verified: boolean;
  created_at: string;
};

// Points event
export type PointsEvent = {
  id: string;
  user_id: string;
  points: number;
  reason: string;
  meta_json?: Record<string, any>;
  created_at: string;
};

// Israeli Ministry of Health provider types
export interface IsraelMoHProductRaw {
  [key: string]: any; // Raw row from dataset/API
}

export interface IsraelMoHMatchMeta {
  matchedBy: 'barcode' | 'name_hebrew' | 'name_en';
  datasetVersion?: string;
  publisher?: string;
}