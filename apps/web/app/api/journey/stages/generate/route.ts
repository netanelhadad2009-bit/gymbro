/**
 * POST /api/journey/stages/generate
 *
 * Generates stages based on avatar profile (without saving to database)
 * Used during plan creation to pre-generate stages
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildStagesForAvatar, type AvatarProfile } from '@/lib/journey/stages/builder';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(request: NextRequest) {
  try {
    console.log('[StagesGenerate] POST /api/journey/stages/generate - Start');

    // Parse request body
    const body = await request.json();
    const { avatar } = body;

    if (!avatar || !avatar.goal) {
      console.error('[StagesGenerate] Invalid request body:', { hasAvatar: !!avatar });
      return NextResponse.json(
        { ok: false, error: 'InvalidRequest', message: 'avatar with goal is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const avatarProfile: AvatarProfile = {
      id: avatar.id || 'temp-id',
      goal: avatar.goal,
      diet: avatar.diet,
      frequency: avatar.frequency,
      experience: avatar.experience,
      gender: avatar.gender,
    };

    console.log('[StagesGenerate] Building stages for avatar:', {
      goal: avatarProfile.goal,
      experience: avatarProfile.experience,
    });

    // Build stages from templates
    const stages = buildStagesForAvatar(avatarProfile);
    console.log('[StagesGenerate] Built stages:', stages.length);

    return NextResponse.json(
      {
        ok: true,
        stages,
        count: stages.length,
        message: `Generated ${stages.length} stages`,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error('[StagesGenerate] Fatal error:', {
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
