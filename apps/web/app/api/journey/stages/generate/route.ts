/**
 * POST /api/journey/stages/generate
 *
 * Generates stages based on avatar profile (without saving to database)
 * Used during plan creation to pre-generate stages
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildStagesForAvatar, type AvatarProfile } from '@/lib/journey/stages/builder';
import { checkRateLimit, validateBody, RateLimitPresets, handleApiError } from '@/lib/api/security';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Zod schema for validating avatar profile
const GenerateStagesSchema = z.object({
  avatar: z.object({
    id: z.string().optional(),
    goal: z.string().min(1, 'Goal is required'),
    diet: z.string().optional(),
    frequency: z.string().optional(),
    experience: z.string().optional(),
    gender: z.string().optional(),
  }),
});

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export async function POST(request: NextRequest) {
  try {
    console.log('[StagesGenerate] POST /api/journey/stages/generate - Start');

    // Rate limiting check (PUBLIC preset - can be called during signup)
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.public,
      keyPrefix: 'stages-generate',
    });

    if (!rateLimit.allowed) {
      console.log('[StagesGenerate] Rate limit exceeded');
      return NextResponse.json(
        {
          ok: false,
          error: 'RateLimitExceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimit.resetAt
        },
        {
          status: 429,
          headers: {
            ...NO_CACHE_HEADERS,
            'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000))
          }
        }
      );
    }

    // Validate request body
    const validation = await validateBody(request, GenerateStagesSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { avatar } = validation.data;

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
    });
    return handleApiError(err, 'StagesGenerate');
  }
}
