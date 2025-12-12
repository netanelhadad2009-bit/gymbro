/**
 * Serving Size Generation Logic
 * Generates MyFitnessPal-style serving options based on food type
 */

import type { ProviderResult, Per100g } from './providers/base';

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

/**
 * Calculate nutrition for a specific serving size
 */
function calculateNutrition(per100g: Per100g, grams: number) {
  const factor = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * factor),
    protein_g: Math.round(per100g.protein_g * factor * 10) / 10,
    carbs_g: Math.round(per100g.carbs_g * factor * 10) / 10,
    fat_g: Math.round(per100g.fat_g * factor * 10) / 10,
  };
}

/**
 * Create a serving option
 */
function createServing(
  id: string,
  label: string,
  grams: number,
  per100g: Per100g,
  isDefault = false
): ServingOption {
  return {
    id,
    label,
    grams,
    isDefault,
    nutrition: calculateNutrition(per100g, grams),
  };
}

/**
 * Check if food name matches a pattern (case-insensitive, Hebrew + English)
 */
function matchesFood(name: string, patterns: string[]): boolean {
  const lowerName = name.toLowerCase();
  return patterns.some(pattern => lowerName.includes(pattern.toLowerCase()));
}

/**
 * Detect food type and suggest appropriate serving sizes
 */
function detectFoodType(name: string): 'egg' | 'bread' | 'beverage' | 'fruit' | 'vegetable' | 'generic' {
  // Eggs
  if (matchesFood(name, ['egg', 'ביצה', 'ביצים', 'בצה'])) {
    return 'egg';
  }

  // Bread & sliced items
  if (matchesFood(name, ['bread', 'לחם', 'toast', 'טוסט', 'slice', 'פרוסה', 'bagel', 'בייגל', 'pita', 'פיתה', 'tortilla'])) {
    return 'bread';
  }

  // Beverages
  if (matchesFood(name, ['milk', 'חלב', 'juice', 'מיץ', 'water', 'מים', 'coffee', 'קפה', 'tea', 'תה', 'soda', 'drink', 'משקה'])) {
    return 'beverage';
  }

  // Fruits
  if (matchesFood(name, ['apple', 'תפוח', 'banana', 'בננה', 'orange', 'תפוז', 'strawberry', 'תות'])) {
    return 'fruit';
  }

  // Vegetables
  if (matchesFood(name, ['tomato', 'עגבניה', 'cucumber', 'מלפפון', 'carrot', 'גזר', 'pepper', 'פלפל'])) {
    return 'vegetable';
  }

  return 'generic';
}

/**
 * Generate smart serving options based on food type
 */
export function generateServingOptions(food: ProviderResult): ServingOption[] {
  const options: ServingOption[] = [];
  const foodType = detectFoodType(food.name);

  // Always include 100g as baseline
  options.push(createServing('100g', '100g', 100, food.per100g, true));

  // Add type-specific servings
  switch (foodType) {
    case 'egg':
      options.push(createServing('1-egg-small', '1 egg small (50g)', 50, food.per100g));
      options.push(createServing('1-egg-medium', '1 egg medium (58g)', 58, food.per100g));
      options.push(createServing('1-egg-large', '1 egg large (63g)', 63, food.per100g));
      break;

    case 'bread':
      options.push(createServing('1-slice', '1 slice (30g)', 30, food.per100g));
      options.push(createServing('2-slices', '2 slices (60g)', 60, food.per100g));
      if (matchesFood(food.name, ['bagel', 'בייגל'])) {
        options.push(createServing('1-bagel', '1 bagel (90g)', 90, food.per100g));
      }
      if (matchesFood(food.name, ['pita', 'פיתה'])) {
        options.push(createServing('1-pita', '1 pita (60g)', 60, food.per100g));
      }
      break;

    case 'beverage':
      options.push(createServing('1-cup', '1 cup (240ml)', 240, food.per100g));
      options.push(createServing('1-glass', '1 glass (300ml)', 300, food.per100g));
      options.push(createServing('1-bottle', '1 bottle (500ml)', 500, food.per100g));
      break;

    case 'fruit':
      options.push(createServing('1-small', '1 small (80g)', 80, food.per100g));
      options.push(createServing('1-medium', '1 medium (120g)', 120, food.per100g));
      options.push(createServing('1-large', '1 large (180g)', 180, food.per100g));
      break;

    case 'vegetable':
      options.push(createServing('1-small', '1 small (80g)', 80, food.per100g));
      options.push(createServing('1-medium', '1 medium (120g)', 120, food.per100g));
      options.push(createServing('1-cup', '1 cup (150g)', 150, food.per100g));
      break;

    case 'generic':
      // Use provider's serving size if available
      if (food.servingSizeGrams && food.servingSizeGrams !== 100) {
        options.push(
          createServing(
            '1-serving',
            `1 serving (${food.servingSizeGrams}g)`,
            food.servingSizeGrams,
            food.per100g
          )
        );
      }
      break;
  }

  // Add common weight options (skip if already added)
  const existingGrams = new Set(options.map(o => o.grams));
  const commonSizes = [50, 150, 200, 250];

  for (const grams of commonSizes) {
    if (!existingGrams.has(grams)) {
      options.push(createServing(`${grams}g`, `${grams}g`, grams, food.per100g));
    }
  }

  return options;
}

/**
 * Get the default serving ID for a food
 * Returns 100g by default, or a smart default based on food type
 */
export function getDefaultServingId(food: ProviderResult): string {
  const foodType = detectFoodType(food.name);

  switch (foodType) {
    case 'egg':
      return '1-egg-medium';
    case 'bread':
      if (matchesFood(food.name, ['bagel', 'בייגל'])) return '1-bagel';
      if (matchesFood(food.name, ['pita', 'פיתה'])) return '1-pita';
      return '1-slice';
    case 'beverage':
      return '1-cup';
    case 'fruit':
    case 'vegetable':
      return '1-medium';
    default:
      // Use provider serving if available and reasonable (between 50g-300g)
      if (
        food.servingSizeGrams &&
        food.servingSizeGrams >= 50 &&
        food.servingSizeGrams <= 300
      ) {
        return '1-serving';
      }
      return '100g';
  }
}
