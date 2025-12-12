/**
 * Stage Builder - Selects pre-made stage templates based on avatar/profile
 *
 * Instead of dynamically building stages, we select from pre-made templates
 * This is faster and ensures consistent quality across all users
 */

import { getStageTemplate, type AvatarTemplateProfile } from './templates';

export type BuiltStage = {
  code: string;
  title_he: string;
  subtitle_he?: string;
  color_hex: string;
  tasks: Array<{
    key_code: string;
    title_he: string;
    desc_he?: string;
    points?: number;
    condition_json: any; // TaskCondition from rules/eval.ts
  }>;
};

export interface AvatarProfile {
  id: string;
  goal: 'loss' | 'gain' | 'recomp' | 'maintain';
  diet?: string;
  frequency?: string | number;
  experience?: string;
  gender?: string;
}

/**
 * Normalize experience to one of three levels
 */
function normalizeExperience(experience?: string): 'beginner' | 'intermediate' | 'advanced' {
  if (!experience) return 'beginner';

  const exp = experience.toLowerCase();
  if (exp.includes('beginner') || exp.includes('new')) return 'beginner';
  if (exp.includes('advanced') || exp.includes('expert')) return 'advanced';
  return 'intermediate';
}

/**
 * Build personalized stages for a user based on their avatar
 *
 * This function now selects from pre-made templates instead of building from scratch
 */
export function buildStagesForAvatar(avatar: AvatarProfile): BuiltStage[] {
  console.log('[StageBuilder] Selecting template for avatar:', {
    goal: avatar.goal,
    experience: avatar.experience,
  });

  // Normalize avatar profile for template selection
  const templateProfile: AvatarTemplateProfile = {
    goal: avatar.goal,
    experience: normalizeExperience(avatar.experience),
  };

  // Get pre-made template for this avatar type
  const stages = getStageTemplate(templateProfile);

  console.log('[StageBuilder] Selected template with stages:', stages.length);

  return stages;
}
