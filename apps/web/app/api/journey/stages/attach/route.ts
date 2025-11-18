/**
 * POST /api/journey/stages/attach
 *
 * Attaches pre-generated stages from plan session to user's database
 * Used during signup to save stages that were generated during plan creation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveUserStages } from '@/lib/journey/stages/persist';
import { z } from 'zod';
import { requireAuth, checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

// Zod schema for validating pre-generated stages
const AttachStagesSchema = z.object({
  stages: z.array(z.any()).min(1, 'At least one stage is required'),
});

export async function POST(request: NextRequest) {
  try {
    console.log('[StagesAttach] POST /api/journey/stages/attach - Start');

    // Rate limiting check (AUTH preset - one-time attach operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.auth,
      keyPrefix: 'stages-attach',
    });

    if (!rateLimit.allowed) {
      console.log('[StagesAttach] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Authentication check
    const auth = await requireAuth();
    if (!auth.success) {
      return auth.response;
    }
    const { user, supabase } = auth;

    // Validate request body
    const validation = await validateBody(request, AttachStagesSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { stages } = validation.data;
    const userId = user.id;
    console.log('[StagesAttach] Authenticated user:', {
      userId: userId.substring(0, 8),
      email: user.email,
    });

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

    return handleApiError(err, 'StagesAttach');
  }
}
