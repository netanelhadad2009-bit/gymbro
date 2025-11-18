/**
 * POST /api/journey/stages/bootstrap
 *
 * Creates initial stages for a user based on their avatar/profile
 * Idempotent: returns existing if already bootstrapped
 * Supports authentication via cookies or Bearer token
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClientWithAuth } from '@/lib/supabase-server';
import { buildStagesForAvatar, type AvatarProfile } from '@/lib/journey/stages/builder';
import { saveUserStages } from '@/lib/journey/stages/persist';
import { checkRateLimit, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(request: NextRequest) {
  try {
    console.log('[StagesBootstrap] POST /api/journey/stages/bootstrap - Start');

    // Rate limiting check (AUTH preset - one-time bootstrap operation)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.auth,
      keyPrefix: 'stages-bootstrap',
    });

    if (!rateLimit.allowed) {
      console.log('[StagesBootstrap] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Auth check (supports both cookies and Bearer tokens)
    const supabase = await createServerSupabaseClientWithAuth();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[StagesBootstrap] Auth error:', authError?.message || 'No user');
      return ErrorResponses.unauthorized('Authentication required');
    }

    const userId = user.id;
    console.log('[StagesBootstrap] Authenticated user:', {
      userId: userId.substring(0, 8),
      email: user.email,
    });

    // Fetch user's avatar from unified avatars table
    const { data: avatar, error: avatarError } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (avatarError) {
      console.error('[StagesBootstrap] Avatar fetch error:', avatarError.message);
      return NextResponse.json(
        { ok: false, error: 'NoAvatar', message: 'User avatar not found' },
        { status: 404, headers: NO_CACHE_HEADERS }
      );
    }

    // Build avatar profile
    const avatarProfile: AvatarProfile = {
      id: userId,
      goal: avatar.goal || 'maintain',
      diet: avatar.diet,
      frequency: avatar.frequency,
      experience: avatar.experience,
      gender: avatar.gender,
    };

    console.log('[StagesBootstrap] Avatar profile:', {
      goal: avatarProfile.goal,
      experience: avatarProfile.experience,
    });

    // Build stages
    const stages = buildStagesForAvatar(avatarProfile);
    console.log('[StagesBootstrap] Built stages:', stages.length);

    // Save stages
    const result = await saveUserStages(supabase, userId, stages);

    if (result.existing) {
      console.log('[StagesBootstrap] Stages already exist for user:', userId.substring(0, 8));
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

    console.log('[StagesBootstrap] Success - created stages:', {
      userId: userId.substring(0, 8),
      created: result.created,
      stageCount: stages.length,
    });

    return NextResponse.json(
      {
        ok: true,
        created: result.created,
        existing: false,
        message: `Created ${result.created} stages`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[StagesBootstrap] Fatal error:', {
      message: err?.message,
      stack: err?.stack,
    });

    return handleApiError(err, 'StagesBootstrap');
  }
}
