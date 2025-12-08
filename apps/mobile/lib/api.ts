import { OnboardingData } from './onboarding-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// Hebrew translations for activity levels
const ACTIVITY_MAP: Record<string, string> = {
  sedentary: 'נמוכה',
  light: 'בינונית',
  high: 'גבוהה',
};

// Hebrew translations for goals
const GOAL_MAP: Record<string, string> = {
  loss: 'ירידה במשקל',
  gain: 'עלייה במסת שריר',
  recomp: 'הרכב גוף',
  maintain: 'שמירה על משקל',
};

// Hebrew translations for diet types
const DIET_MAP: Record<string, string> = {
  none: 'רגילה',
  vegan: 'טבעוני',
  vegetarian: 'צמחוני',
  keto: 'קטוגני',
  paleo: 'פליאוליתי',
};

// Hebrew translations for gender
const GENDER_MAP: Record<string, string> = {
  male: 'זכר',
  female: 'נקבה',
  other: 'אחר',
};

function calculateAge(birthdate: string | undefined): number {
  if (!birthdate) return NaN;

  try {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age > 0 ? age : NaN;
  } catch {
    return NaN;
  }
}

export type NutritionRequest = {
  gender_he: string;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity_level_he: string;
  goal_he: string;
  diet_type_he: string;
  days: number;
};

export type NutritionPlan = {
  dailyTargets?: {
    calories_target?: number;
    protein_target_g?: number;
    carbs_target_g?: number;
    fat_target_g?: number;
  };
  days?: Array<{
    day: string;
    order: number;
    title: string;
    time: string;
    desc: string;
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>;
};

export type NutritionResponse = {
  ok: boolean;
  plan?: NutritionPlan;
  calories?: number | null;
  fingerprint?: string;
  error?: string;
  message?: string;
};

export type JourneyStage = {
  id: string;
  title: string;
  description: string;
  order: number;
};

export type StagesResponse = {
  ok: boolean;
  stages?: JourneyStage[];
  count?: number;
  message?: string;
  error?: string;
};

export function buildNutritionRequest(onboarding: OnboardingData): NutritionRequest {
  const age = calculateAge(onboarding.birthdate);
  const goal = onboarding.goals?.[0] || 'loss';

  return {
    gender_he: GENDER_MAP[onboarding.gender || 'male'] || 'זכר',
    age: age,
    height_cm: onboarding.height_cm || 170,
    weight_kg: onboarding.weight_kg || 70,
    target_weight_kg: onboarding.target_weight_kg || onboarding.weight_kg || 70,
    activity_level_he: ACTIVITY_MAP[onboarding.activity || 'sedentary'] || 'נמוכה',
    goal_he: GOAL_MAP[goal] || 'ירידה במשקל',
    diet_type_he: DIET_MAP[onboarding.diet || 'none'] || 'רגילה',
    days: 1, // Always 1 for onboarding
  };
}

export async function generateNutritionPlan(
  onboarding: OnboardingData,
  options?: { timeout?: number }
): Promise<NutritionResponse> {
  const timeout = options?.timeout || 90000; // 90 seconds default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const payload = buildNutritionRequest(onboarding);

    console.log('[API] Generating nutrition plan with payload:', payload);

    const response = await fetch(`${API_BASE_URL}/api/ai/nutrition/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.warn('[API] Nutrition generation failed:', data);
      return {
        ok: false,
        error: data.error || 'GenerationError',
        message: data.message || 'Failed to generate nutrition plan',
      };
    }

    console.log('[API] Nutrition plan generated successfully');
    return data as NutritionResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[API] Nutrition generation timed out');
      return {
        ok: false,
        error: 'TimeoutError',
        message: 'Generation timed out. Please try again.',
      };
    }

    console.warn('[API] Nutrition generation error:', error);
    return {
      ok: false,
      error: 'NetworkError',
      message: error.message || 'Network error occurred',
    };
  }
}

export async function generateJourneyStages(
  onboarding: OnboardingData,
  options?: { timeout?: number }
): Promise<StagesResponse> {
  const timeout = options?.timeout || 30000; // 30 seconds default
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const goal = onboarding.goals?.[0] || 'loss';

    const payload = {
      avatar: {
        id: 'temp-id',
        goal: goal,
        diet: onboarding.diet,
        frequency: onboarding.training_frequency_actual,
        experience: onboarding.experience,
        gender: onboarding.gender,
      },
    };

    console.log('[API] Generating journey stages with payload:', payload);

    const response = await fetch(`${API_BASE_URL}/api/journey/stages/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      console.warn('[API] Stages generation failed:', data);
      return {
        ok: false,
        error: data.error || 'GenerationError',
        message: data.message || 'Failed to generate journey stages',
      };
    }

    console.log('[API] Journey stages generated successfully:', data.count);
    return data as StagesResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn('[API] Stages generation timed out');
      return {
        ok: false,
        error: 'TimeoutError',
        message: 'Generation timed out. Please try again.',
      };
    }

    console.warn('[API] Stages generation error:', error);
    return {
      ok: false,
      error: 'NetworkError',
      message: error.message || 'Network error occurred',
    };
  }
}
