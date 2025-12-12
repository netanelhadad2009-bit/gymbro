/**
 * Nutrition Meal Logging Helpers
 * Shared logic for logging meals to the user's diary
 */

// Helper function to get today's date in local timezone (YYYY-MM-DD)
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface FoodToLog {
  name: string;
  name_he?: string;
  brand?: string;
  calories_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  fiber_g_per_100g?: number;
  sugars_g_per_100g?: number;
  sodium_mg_per_100g?: number;
  barcode?: string;
  source?: string;
  isPartial?: boolean;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface LogMealParams {
  food: FoodToLog;
  portionGrams: number;
  mealType?: MealType;
  date?: string; // ISO date string (YYYY-MM-DD)
}

export interface LogMealResult {
  ok: boolean;
  mealId?: string;
  error?: string;
}

/**
 * Calculate scaled nutrition values based on portion size
 */
export function scaleNutrition(food: FoodToLog, portionGrams: number) {
  const scale = portionGrams / 100;

  return {
    calories: Math.round(food.calories_per_100g * scale),
    protein_g: Math.round(food.protein_g_per_100g * scale),
    carbs_g: Math.round(food.carbs_g_per_100g * scale),
    fat_g: Math.round(food.fat_g_per_100g * scale),
    fiber_g: food.fiber_g_per_100g
      ? Math.round(food.fiber_g_per_100g * scale)
      : undefined,
    sugar_g: food.sugars_g_per_100g
      ? Math.round(food.sugars_g_per_100g * scale)
      : undefined,
    sodium_mg: food.sodium_mg_per_100g
      ? Math.round(food.sodium_mg_per_100g * scale)
      : undefined,
  };
}

/**
 * Log a meal from a food item to the user's diary
 */
export async function logMealFromFood(params: LogMealParams): Promise<LogMealResult> {
  const { food, portionGrams, mealType = 'snack', date } = params;

  if (portionGrams <= 0) {
    return {
      ok: false,
      error: 'הכמות חייבת להיות גדולה מאפס',
    };
  }

  try {
    // Calculate scaled nutrition
    const scaled = scaleNutrition(food, portionGrams);

    // Get current date if not provided (using local timezone)
    const logDate = date || getTodayLocalDate();

    // Normalize source to allowed database values
    // Allowed: 'manual', 'ai_vision', 'israel_moh', 'saved_meal', 'plan'
    const normalizeSource = (src?: string): string => {
      const allowedSources = ['manual', 'ai_vision', 'israel_moh', 'saved_meal', 'plan'];
      if (!src || !allowedSources.includes(src)) {
        // Map 'logged', 'moh', or unknown sources to 'manual'
        return 'manual';
      }
      return src;
    };

    // Prepare meal data
    const mealData = {
      date: logDate,
      name: food.name_he || food.name,
      calories: scaled.calories,
      protein: scaled.protein_g,
      carbs: scaled.carbs_g,
      fat: scaled.fat_g,
      fiber: scaled.fiber_g,
      sugar: scaled.sugar_g,
      sodium_mg: scaled.sodium_mg,
      portion_grams: portionGrams,
      meal_type: mealType,
      source: normalizeSource(food.source),
      barcode: food.barcode || undefined,
      brand: food.brand || undefined,
      is_partial: food.isPartial || false,
    };

    console.log('[LogMeal] Logging meal:', mealData);

    // POST to meals API
    const response = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mealData),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[LogMeal] API error:', error);
      throw new Error(error.error || error.message || 'Failed to log meal');
    }

    const result = await response.json();
    console.log('[LogMeal] Success:', result);

    return {
      ok: true,
      mealId: result.meal?.id,
    };
  } catch (error: any) {
    console.error('[LogMeal] Error:', error);
    return {
      ok: false,
      error: error.message || 'שגיאה ברישום הארוחה',
    };
  }
}

/**
 * Format meal type for display (English)
 */
export function formatMealType(mealType: MealType): string {
  const labels: Record<MealType, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };

  return labels[mealType] || 'Snack';
}

/**
 * Log a saved meal with a multiplier
 * Fetches the saved meal, scales it, and logs it for today
 */
export async function logMealFromSavedMeal(opts: {
  mealId: string;
  multiplier: number;
  mealType: MealType;
}): Promise<LogMealResult> {
  const { mealId, multiplier, mealType } = opts;

  if (multiplier <= 0 || multiplier > 5) {
    return {
      ok: false,
      error: 'הכפל חייב להיות בין 0.1 ל-5',
    };
  }

  try {
    console.log('[LogMeal] Fetching saved meal:', mealId);

    // Fetch the saved meal
    const response = await fetch(`/api/meals/${mealId}`, { cache: 'no-store' });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[LogMeal] Fetch error:', error);
      throw new Error(error.error || 'Failed to fetch meal');
    }

    const result = await response.json();

    if (!result.ok || !result.meal) {
      throw new Error('Meal not found');
    }

    const savedMeal = result.meal;

    // Scale the meal totals by multiplier
    const scaled = {
      calories: Math.round(savedMeal.calories * multiplier),
      protein: Math.round((savedMeal.protein || 0) * multiplier),
      carbs: Math.round((savedMeal.carbs || 0) * multiplier),
      fat: Math.round((savedMeal.fat || 0) * multiplier),
    };

    // Get current date (using local timezone)
    const logDate = getTodayLocalDate();

    // Prepare meal data
    const mealData = {
      date: logDate,
      name: savedMeal.name,
      calories: scaled.calories,
      protein: scaled.protein,
      carbs: scaled.carbs,
      fat: scaled.fat,
      meal_type: mealType,
      source: 'saved_meal',
      // Store multiplier in a note for reference
      notes: multiplier !== 1 ? `${multiplier}× מנה שמורה` : 'מנה שמורה',
    };

    console.log('[LogMeal] Logging saved meal:', mealData);

    // POST to meals API
    const createResponse = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mealData),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({}));
      console.error('[LogMeal] API error:', error);
      throw new Error(error.error || error.message || 'Failed to log meal');
    }

    const createResult = await createResponse.json();
    console.log('[LogMeal] Success:', createResult);

    return {
      ok: true,
      mealId: createResult.meal?.id,
    };
  } catch (error: any) {
    console.error('[LogMeal] Error:', error);
    return {
      ok: false,
      error: error.message || 'שגיאה ברישום הארוחה',
    };
  }
}
