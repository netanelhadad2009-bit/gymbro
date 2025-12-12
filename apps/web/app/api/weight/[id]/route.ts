/**
 * Weight Entry API
 * PUT /api/weight/[id] - Update a weight entry
 * DELETE /api/weight/[id] - Delete a weight entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const updateWeightSchema = z.object({
  weight_kg: z.number().min(20).max(500).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClientWithAuth();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updates = updateWeightSchema.parse(body);

    // First verify the entry belongs to this user
    const { data: existing, error: fetchError } = await supabase
      .from('weigh_ins')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { ok: false, error: 'Weight entry not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Record<string, any> = {};
    if (updates.weight_kg !== undefined) updateData.weight_kg = updates.weight_kg;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('weigh_ins')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Weight API] Update error:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: data.id,
        date: data.date,
        weight_kg: data.weight_kg,
        notes: data.notes,
      },
    });
  } catch (error: any) {
    console.error('[Weight API] Error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { ok: false, error: 'Invalid weight data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClientWithAuth();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    // First verify the entry belongs to this user
    const { data: existing, error: fetchError } = await supabase
      .from('weigh_ins')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { ok: false, error: 'Weight entry not found' },
        { status: 404 }
      );
    }

    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('weigh_ins')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Weight API] Delete error:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[Weight API] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
