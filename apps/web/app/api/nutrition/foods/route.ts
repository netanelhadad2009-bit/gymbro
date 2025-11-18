/**
 * Manual Food Products API
 * POST /api/nutrition/foods
 *
 * Allows users to create custom food products manually
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { BarcodeProduct, Per100g } from '@/types/barcode';
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';

// Request validation schema
const createFoodSchema = z.object({
  barcode: z.string().regex(/^[0-9]{8,14}$/).optional(),
  name_he: z.string().min(1, 'Product name is required'),
  brand: z.string().optional(),
  serving_grams: z.number().int().min(1).max(10000),
  per100g: z.object({
    kcal: z.number().int().min(0).max(9999),
    protein_g: z.number().int().min(0).max(999),
    carbs_g: z.number().int().min(0).max(999),
    fat_g: z.number().int().min(0).max(999),
  }),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check (STRICT - prevents points farming via manual food creation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.strict,
      keyPrefix: 'nutrition-foods-post',
    });

    if (!rateLimit.allowed) {
      console.log('[ManualFood] Rate limit exceeded');
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
    const validation = await validateBody(request, createFoodSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { barcode, name_he, brand, serving_grams, per100g } = validation.data;

    console.log('[ManualFood] Creating product:', { name_he, barcode, userId: userId.slice(0, 8) });

    // Insert into user_foods table
    const { data: userFood, error: insertError } = await supabase
      .from('user_foods')
      .insert({
        user_id: userId,
        barcode: barcode || null,
        name_he,
        brand: brand || null,
        serving_grams,
        per_100g: per100g, // JSON column
        is_verified: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[ManualFood] Insert error:', insertError);
      throw new Error(`Failed to create product: ${insertError.message}`);
    }

    console.log('[ManualFood] Product created:', userFood.id);

    // Award +5 points for manual food creation
    try {
      const { error: pointsError } = await supabase
        .from('points_events')
        .insert({
          user_id: userId,
          points: 5,
          reason: 'manual_food_add',
          meta_json: {
            food_id: userFood.id,
            food_name: name_he,
            barcode: barcode || null,
          },
        });

      if (pointsError) {
        console.error('[ManualFood] Points award failed:', pointsError);
        // Don't fail the whole request if points fail
      } else {
        console.log('[ManualFood] +5 points awarded');
      }
    } catch (pointsErr) {
      console.error('[ManualFood] Points error:', pointsErr);
      // Continue even if points fail
    }

    // Convert to BarcodeProduct format for consistency
    const product: BarcodeProduct = {
      barcode: userFood.barcode || undefined,
      name: userFood.name_he,
      name_he: userFood.name_he,
      brand: userFood.brand || undefined,
      per100g: userFood.per_100g as Per100g,
      serving_grams: userFood.serving_grams,
      source: 'manual',
      isPartial: false,
    };

    console.log('[ManualFood] Success:', {
      id: userFood.id,
      name: name_he,
      points: '+5',
    });

    return NextResponse.json({
      ok: true,
      product,
      food_id: userFood.id,
    });

  } catch (error) {
    console.error('[ManualFood] Fatal error:', error);
    return handleApiError(error, 'NutritionFoodsPost');
  }
}

// GET /api/nutrition/foods - Get user's custom foods
export async function GET(request: NextRequest) {
  try {
    // Rate limiting check (STANDARD - read operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.standard,
      keyPrefix: 'nutrition-foods-get',
    });

    if (!rateLimit.allowed) {
      console.log('[ManualFood GET] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    const userId = user.id;

    // Get user's custom foods
    const { data: foods, error } = await supabase
      .from('user_foods')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[ManualFood] Fetch error:', error);
      throw new Error('Failed to fetch foods');
    }

    // Convert to BarcodeProduct format
    const products: BarcodeProduct[] = (foods || []).map((food) => ({
      barcode: food.barcode || undefined,
      name: food.name_he,
      name_he: food.name_he,
      brand: food.brand || undefined,
      per100g: food.per_100g as Per100g,
      serving_grams: food.serving_grams,
      source: 'manual',
      isPartial: false,
    }));

    return NextResponse.json({
      ok: true,
      products,
    });

  } catch (error) {
    console.error('[ManualFood GET] Error:', error);
    return handleApiError(error, 'NutritionFoodsGet');
  }
}
