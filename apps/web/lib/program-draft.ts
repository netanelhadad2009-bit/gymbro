/**
 * Program draft storage utilities
 * Used to save generated programs locally before signup
 */

export type ProgramDraft = {
  days: number;
  workoutText?: string;
  nutritionJson?: {
    meta?: {
      calories_target?: number;
      protein_target_g?: number;
      carbs_target_g?: number;
      fat_target_g?: number;
      start_date?: string;
    };
    meals_flat?: Array<{
      day: string;
      order: 1 | 2 | 3 | 4 | 5;
      title: string;
      time: string;
      desc: string;
      kcal: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
    }>;
  };
  createdAt?: number;
};

const KEY = "program.draft";

export function saveProgramDraft(draft: ProgramDraft) {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {}
}

export function readProgramDraft(): ProgramDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ProgramDraft) : null;
  } catch {
    return null;
  }
}

export function clearProgramDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
