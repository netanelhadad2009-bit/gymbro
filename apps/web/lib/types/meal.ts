export type MealSource = 'manual' | 'ai_vision';

export interface MealInsert {
  user_id: string;
  date: string; // ISO date YYYY-MM-DD
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  source: MealSource;
  image_url?: string | null;
  confidence?: number | null;
}

export interface Meal extends MealInsert {
  id: string;
  created_at: string;
}