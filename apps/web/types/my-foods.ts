/**
 * My Foods Types
 * Shared types for user's manually added and recently logged foods
 */

export type MyFoodSource = 'manual' | 'moh' | 'logged';

export interface MyFoodResult {
  id: string;
  source: MyFoodSource;
  ref_id?: string; // MoH food id if source='moh'
  name_he: string;
  brand?: string | null;
  calories_per_100g: number | null;
  protein_g_per_100g: number | null;
  carbs_g_per_100g: number | null;
  fat_g_per_100g: number | null;
  last_used_at?: string;
  usage_count?: number;

  // For logged meals
  mealId?: string;  // == id when source === 'logged'
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  loggedAt?: string;
}
