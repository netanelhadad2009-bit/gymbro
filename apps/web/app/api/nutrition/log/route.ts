/**
 * Nutrition Log API
 * POST /api/nutrition/log
 *
 * Logs a food item to the user's meal diary
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Per100g, MealType } from '@/types/barcode';
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';

// Request validation
const logSchema = z.object({
  barcode: z.string().optional(),
  productName: z.string().min(1, 'Product name required'),
  brand: z.string().optional(),
  grams: z.number().positive('Grams must be positive'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  per100g: z.object({
    kcal: z.number().nonnegative(),
    protein_g: z.number().nonnegative(),
    carbs_g: z.number().nonnegative(),
    fat_g: z.number().nonnegative(),
    fiber_g: z.number().nonnegative().optional(),
    sugar_g: z.number().nonnegative().optional(),
    sodium_mg: z.number().nonnegative().optional(),
  }),
});

// Get meal type label in English
function getMealTypeLabel(type?: MealType): string {
  switch (type) {
    case 'breakfast': return 'Breakfast';
    case 'lunch': return 'Lunch';
    case 'dinner': return 'Dinner';
    case 'snack': return 'Snack';
    default: return 'Meal';
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - logging operation with points)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'nutrition-log',
    });

    if (!rateLimit.allowed) {
      console.log('[NutritionLog] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const userId = user.id;

    // Validate request body
    const validation = await validateBody(request, logSchema);
    if (!validation.success) {
      return validation.response;
    }

    const {
      barcode,
      productName,
      brand,
      grams,
      mealType,
      per100g
    } = validation.data;

    // Scale macros to portion size
    const scale = grams / 100;
    const scaledKcal = Math.round(per100g.kcal * scale);
    const scaledProtein = Math.round(per100g.protein_g * scale * 10) / 10;
    const scaledCarbs = Math.round(per100g.carbs_g * scale * 10) / 10;
    const scaledFat = Math.round(per100g.fat_g * scale * 10) / 10;
    const scaledFiber = per100g.fiber_g ? Math.round(per100g.fiber_g * scale * 10) / 10 : null;
    const scaledSugar = per100g.sugar_g ? Math.round(per100g.sugar_g * scale * 10) / 10 : null;
    const scaledSodium = per100g.sodium_mg ? Math.round(per100g.sodium_mg * scale) : null;

    // Get today's date in user's timezone (assuming Israel for now)
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];

    // Prepare meal name with brand if available
    const fullName = brand ? `${productName} (${brand})` : productName;

    // Insert into meals table
    // Database columns: user_id, date, name, calories (int), protein (int), carbs (int), fat (int), source
    // Note: source must be 'manual', 'ai_vision', or 'plan' per schema constraint
    const { data: meal, error: insertError } = await supabase
      .from('meals')
      .insert({
        user_id: userId,
        date: todayISO,
        name: fullName,
        calories: scaledKcal,
        protein: Math.round(scaledProtein),
        carbs: Math.round(scaledCarbs),
        fat: Math.round(scaledFat),
        source: 'manual', // Using 'manual' for barcode scans (closest match)
      })
      .select()
      .single();

    if (insertError) {
      console.error('[NutritionLog] Insert error:', insertError);
      throw new Error(`Failed to log meal: ${insertError.message}`);
    }

    // Award points for logging via barcode (optional - if points system exists)
    try {
      await supabase
        .from('user_points')
        .insert({
          user_id: userId,
          points: 10,
          reason: `סריקת ברקוד: ${productName}`,
          created_at: now.toISOString(),
        });
    } catch (pointsError) {
      // Points are optional, don't fail the whole request
      console.log('[NutritionLog] Points award skipped:', pointsError);
    }

    console.log('[NutritionLog] Success:', {
      userId: userId.slice(0, 8),
      product: fullName,
      grams,
      kcal: scaledKcal,
    });

    return NextResponse.json({
      ok: true,
      meal,
      totals: {
        kcal: scaledKcal,
        protein_g: scaledProtein,
        carbs_g: scaledCarbs,
        fat_g: scaledFat,
        fiber_g: scaledFiber,
        sugar_g: scaledSugar,
        sodium_mg: scaledSodium,
      }
    });

  } catch (error) {
    console.error('[NutritionLog] Fatal error:', error);
    return handleApiError(error, 'NutritionLog');
  }
}