/**
 * Progress tracking types for mobile app
 * Mirrors the web version's data structures
 */

export type WeightPoint = {
  id: string;
  t: string; // ISO timestamp (created_at for ordering)
  date: string; // YYYY-MM-DD (user-selected date for display)
  kg: number;
  notes?: string | null;
};

export type DailyNutrition = {
  d: string; // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type ProgressKPIs = {
  today: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    date: string;
  };
  avg7d: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  avg30d: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
  weight: {
    current: number | null;
    delta7d: number | null;
    delta30d: number | null;
    trend: 'up' | 'down' | 'stable' | null;
  };
};

export type ProgressRange = '7d' | '14d' | '30d' | '90d';

export type ProgressData = {
  kpis: ProgressKPIs;
  weight: WeightPoint[];
  nutrition: DailyNutrition[];
};

export type ProgressResponse =
  | { ok: true; kpis: ProgressKPIs; weight: WeightPoint[]; nutrition: DailyNutrition[]; latencyMs: number }
  | { ok: false; error: string; latencyMs?: number };

// Chart color theme
export const chartColors = {
  background: '#0E0F10',
  surface: '#141516',
  textPrimary: '#FFFFFF',
  textSecondary: '#A5A7AA',
  accent: '#E2F163',
  positive: '#9BEF7D',
  negative: '#FF6B6B',
  neutral: '#3A3B3D',
  protein: '#C9456C',
  carbs: '#FFA856',
  fat: '#5B9BFF',
};
