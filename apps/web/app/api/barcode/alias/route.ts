/**
 * Barcode Alias API
 * POST /api/barcode/alias
 *
 * Creates a community-contributed mapping between a barcode and an Israeli MoH food item
 * Awards points for successful alias creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// Request validation
const aliasSchema = z.object({
  barcode: z
    .string()
    .regex(/^[0-9]{8,14}$/, 'Barcode must be 8-14 digits'),
  moh_food_id: z.number().int().positive('Invalid food ID'),
});

// Points awarded for creating an alias
const ALIAS_POINTS = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const { barcode, moh_food_id } = aliasSchema.parse(body);

    console.log(
      `[Alias] Creating alias: barcode=${barcode}, moh_food_id=${moh_food_id}`
    );

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      console.log('[Alias] Unauthorized request');
      return NextResponse.json(
        { ok: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Verify the MoH food item exists
    const { data: foodItem, error: foodError } = await supabase
      .from('israel_moh_foods')
      .select('id, name_he, brand')
      .eq('id', moh_food_id)
      .single();

    if (foodError || !foodItem) {
      console.log(
        `[Alias] MoH food not found: ${moh_food_id}`,
        foodError?.message
      );
      return NextResponse.json(
        { ok: false, error: 'Food item not found in Israeli MoH database' },
        { status: 404 }
      );
    }

    console.log(
      `[Alias] Food item verified: ${foodItem.name_he} ${foodItem.brand ? `(${foodItem.brand})` : ''}`
    );

    // Check if alias already exists
    const { data: existingAlias } = await supabase
      .from('barcode_aliases')
      .select('id, user_id, moh_food_id')
      .eq('barcode', barcode)
      .single();

    if (existingAlias) {
      console.log(
        `[Alias] Alias already exists for barcode ${barcode}: created by user ${existingAlias.user_id}`
      );

      // Check if it's the same mapping
      if (existingAlias.moh_food_id === moh_food_id) {
        console.log('[Alias] Identical mapping already exists, returning it');
        return NextResponse.json({
          ok: true,
          alias: {
            barcode,
            moh_food_id,
            user_id: existingAlias.user_id,
            created_by_current_user: existingAlias.user_id === userId,
          },
          message: 'This barcode mapping already exists',
        });
      } else {
        console.log(
          `[Alias] Conflict: barcode ${barcode} is already mapped to different food (${existingAlias.moh_food_id})`
        );
        return NextResponse.json(
          {
            ok: false,
            error: 'This barcode is already mapped to a different product',
          },
          { status: 409 }
        );
      }
    }

    // Create the alias
    const { data: newAlias, error: aliasError } = await supabase
      .from('barcode_aliases')
      .insert({
        user_id: userId,
        barcode,
        moh_food_id,
      })
      .select()
      .single();

    if (aliasError) {
      console.error('[Alias] Insert error:', aliasError);

      // Handle unique constraint violation (race condition)
      if (aliasError.code === '23505') {
        return NextResponse.json(
          {
            ok: false,
            error: 'This barcode was just mapped by another user',
          },
          { status: 409 }
        );
      }

      throw aliasError;
    }

    console.log(`[Alias] Created successfully: id=${newAlias.id}`);

    // Award points for contribution
    const { error: pointsError } = await supabase.from('points_events').insert({
      user_id: userId,
      points: ALIAS_POINTS,
      reason: 'barcode_alias_create',
      meta_json: {
        barcode,
        moh_food_id,
        food_name: foodItem.name_he,
        brand: foodItem.brand,
      },
    });

    if (pointsError) {
      console.error('[Alias] Failed to award points:', pointsError);
      // Don't fail the request, alias was created successfully
    } else {
      console.log(`[Alias] Awarded ${ALIAS_POINTS} points to user ${userId}`);
    }

    return NextResponse.json(
      {
        ok: true,
        alias: {
          barcode,
          moh_food_id,
          user_id: userId,
          created_by_current_user: true,
        },
        points_awarded: ALIAS_POINTS,
        message: 'Barcode mapped successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[Alias] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.issues[0].message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
