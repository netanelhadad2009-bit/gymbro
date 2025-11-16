/**
 * Nutrition Log API
 * POST /api/nutrition/log
 *
 * Logs a food item to the user's meal diary
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { Per100g, MealType } from '@/types/barcode';

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

// Get meal type in Hebrew
function getMealTypeHebrew(type?: MealType): string {
  switch (type) {
    case 'breakfast': return 'ארוחת בוקר';
    case 'lunch': return 'ארוחת צהריים';
    case 'dinner': return 'ארוחת ערב';
    case 'snack': return 'חטיף';
    default: return 'ארוחה';
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('[NutritionLog] Auth error:', authError?.message || 'No session');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate input
    const {
      barcode,
      productName,
      brand,
      grams,
      mealType,
      per100g
    } = logSchema.parse(body);

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

  } catch (err: any) {
    console.error('[NutritionLog] Fatal error:', {
      message: err?.message,
      stack: err?.stack,
    });

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Invalid input', details: err.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: err?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}