/**
 * Weight Logging API
 * POST /api/weight - Log a new weight entry
 * GET /api/weight - Get weight history
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const logWeightSchema = z.object({
  weight_kg: z.number().min(20).max(500),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClientWithAuth();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { weight_kg, date, notes } = logWeightSchema.parse(body);

    // Use provided date or today
    const weightDate = date || new Date().toISOString().split('T')[0];

    // Always insert a new entry (allows multiple weigh-ins per day)
    const { data, error } = await supabase
      .from('weigh_ins')
      .insert({
        user_id: user.id,
        date: weightDate,
        weight_kg,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Weight API] Insert error:', error);
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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClientWithAuth();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('weigh_ins')
      .select('date, weight_kg, notes')
      .eq('user_id', user.id)
      .gte('date', cutoffDate.toISOString())
      .order('date', { ascending: false });

    if (error) {
      console.error('[Weight API] Fetch error:', error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      entries: data || [],
    });
  } catch (error: any) {
    console.error('[Weight API] Error:', error);
    return NextResponse.json(
      { ok: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
