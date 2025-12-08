import AsyncStorage from '@react-native-async-storage/async-storage';
import { NutritionPlan, JourneyStage } from './api';

const PROGRAM_DRAFT_KEY = 'program_draft';
const PROGRAM_DRAFT_VERSION = 1;

export interface ProgramDraft {
  version: number;
  days: number;
  nutritionPlan?: NutritionPlan;
  calories?: number | null;
  stages?: JourneyStage[];
  createdAt: number;
}

export async function saveProgramDraft(draft: Omit<ProgramDraft, 'version' | 'createdAt'>): Promise<boolean> {
  try {
    const fullDraft: ProgramDraft = {
      ...draft,
      version: PROGRAM_DRAFT_VERSION,
      createdAt: Date.now(),
    };
    await AsyncStorage.setItem(PROGRAM_DRAFT_KEY, JSON.stringify(fullDraft));
    console.log('[ProgramDraft] Saved draft:', {
      hasNutritionPlan: !!fullDraft.nutritionPlan,
      calories: fullDraft.calories,
      stagesCount: fullDraft.stages?.length || 0,
    });
    return true;
  } catch (error) {
    console.error('[ProgramDraft] Error saving draft:', error);
    return false;
  }
}

export async function getProgramDraft(): Promise<ProgramDraft | null> {
  try {
    const data = await AsyncStorage.getItem(PROGRAM_DRAFT_KEY);
    if (!data) return null;

    const draft = JSON.parse(data) as ProgramDraft;

    // Check version compatibility
    if (draft.version !== PROGRAM_DRAFT_VERSION) {
      console.log('[ProgramDraft] Version mismatch, clearing old draft');
      await clearProgramDraft();
      return null;
    }

    return draft;
  } catch (error) {
    console.error('[ProgramDraft] Error reading draft:', error);
    return null;
  }
}

export async function clearProgramDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROGRAM_DRAFT_KEY);
    console.log('[ProgramDraft] Cleared');
  } catch (error) {
    console.error('[ProgramDraft] Error clearing draft:', error);
  }
}

export async function hasProgramDraft(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(PROGRAM_DRAFT_KEY);
    return data !== null;
  } catch {
    return false;
  }
}
