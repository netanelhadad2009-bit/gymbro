/**
 * POST /api/journey/stages/attach
 *
 * Attaches pre-generated stages from plan session to user's database
 * Used during signup to save stages that were generated during plan creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveUserStages } from '@/lib/journey/stages/persist';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(request: NextRequest) {
  try {
    console.log('[StagesAttach] POST /api/journey/stages/attach - Start');

    // Auth check
    const supabase = await createClient();
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError || !session?.user) {
      console.error('[StagesAttach] Auth error:', authError?.message || 'No session');
      return NextResponse.json(
        { ok: false, error: 'Unauthorized', message: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    const userId = session.user.id;
    console.log('[StagesAttach] Authenticated user:', {
      userId: userId.substring(0, 8),
      email: session.user.email,
    });

    // Parse request body
    const body = await request.json();
    const { stages } = body;

    if (!stages || !Array.isArray(stages)) {
      console.error('[StagesAttach] Invalid request body:', { hasStages: !!stages, isArray: Array.isArray(stages) });
      return NextResponse.json(
        { ok: false, error: 'InvalidRequest', message: 'stages array is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    console.log('[StagesAttach] Received pre-generated stages:', stages.length);

    // Save stages to database
    const result = await saveUserStages(supabase, userId, stages);

    if (result.existing) {
      console.log('[StagesAttach] Stages already exist for user:', userId.substring(0, 8));
      return NextResponse.json(
        {
          ok: true,
          created: 0,
          existing: true,
          message: 'Stages already exist',
        },
        { headers: NO_CACHE_HEADERS }
      );
    }

    console.log('[StagesAttach] Success - attached stages:', {
      userId: userId.substring(0, 8),
      created: result.created,
      stageCount: stages.length,
    });

    return NextResponse.json(
      {
        ok: true,
        created: result.created,
        existing: false,
        message: `Attached ${result.created} pre-generated stages`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[StagesAttach] Fatal error:', {
      message: err?.message,
      stack: err?.stack,
    });

    return NextResponse.json(
      {
        ok: false,
        error: 'ServerError',
        message: err?.message || 'Unknown error',
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
