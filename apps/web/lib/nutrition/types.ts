/**
 * Shared types for nutrition/meal AI vision pipeline
 */

/**
 * Result from AI Vision API analysis
 */
export type VisionMealResult = {
  meal_name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  confidence?: number;
  health_score?: number; // 0-100 health rating from AI
  ingredients?: string[];
  image_url?: string; // Supabase storage URL if uploaded
};

/**
 * Payload for inserting a meal into the database
 */
export type MealInsertPayload = {
  user_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "manual" | "ai_vision";
  image_url?: string;
  confidence?: number;
};

/**
 * Temporary cached data for meal review screen
 */
export type MealReviewCache = {
  result: VisionMealResult;
  imageUrl: string; // Local object URL or Supabase URL
  createdAt: number; // timestamp
};

/**
 * Meal database row (matches Supabase schema)
 */
export type Meal = {
  id: string;
  user_id: string;
  date: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: "manual" | "ai_vision";
  image_url?: string;
  confidence?: number;
  created_at: string;
  updated_at: string;
};
