/**
 * Journey Routes
 * Handles journey stage generation for mobile app
 */

import { Router } from "express";
import { z } from "zod";
import { buildStagesForAvatar, type AvatarProfile } from "../lib/journey/stages/builder";

export const journeyRouter = Router();

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

/**
 * POST /api/journey/stages/generate
 *
 * Generates stages based on avatar profile (without saving to database)
 * Used during plan creation to pre-generate stages
 */
journeyRouter.post("/stages/generate", async (req, res) => {
  try {
    console.log('[JourneyStages] POST /api/journey/stages/generate - Start');

    // Validate request body
    const parsed = GenerateStagesSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log('[JourneyStages] Validation failed:', parsed.error);
      return res.status(400).json({
        ok: false,
        error: 'ValidationError',
        message: 'Invalid request body',
        details: parsed.error.issues,
      });
    }

    const { avatar } = parsed.data;

    const avatarProfile: AvatarProfile = {
      id: avatar.id || 'temp-id',
      goal: avatar.goal as 'loss' | 'gain' | 'recomp' | 'maintain',
      diet: avatar.diet,
      frequency: avatar.frequency,
      experience: avatar.experience,
      gender: avatar.gender,
    };

    console.log('[JourneyStages] Building stages for avatar:', {
      goal: avatarProfile.goal,
      experience: avatarProfile.experience,
    });

    // Build stages from templates
    const stages = buildStagesForAvatar(avatarProfile);
    console.log('[JourneyStages] Built stages:', stages.length);

    return res.json({
      ok: true,
      stages,
      count: stages.length,
      message: `Generated ${stages.length} stages`,
    });
  } catch (err: any) {
    console.error('[JourneyStages] Fatal error:', {
      message: err?.message,
    });
    return res.status(500).json({
      ok: false,
      error: 'InternalError',
      message: 'Failed to generate stages',
      details: err?.message,
    });
  }
});
