import { JourneyNode, UserNodeState } from './types';
import { supabase } from '@/lib/supabase';

// utilities
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

export type EvalContext = {
  userId: string;
  proteinTarget?: number; // g
};

export async function evalNodeProgress(
  node: JourneyNode,
  ctx: EvalContext
): Promise<UserNodeState> {
  switch (node.type) {
    case 'FIRST_WEIGH_IN': {
      const { data } = await supabase
        .from('weigh_ins')
        .select('id')
        .eq('user_id', ctx.userId)
        .limit(1);
      const completed = (data?.length ?? 0) > 0;
      return state(node, completed ? 1 : 0);
    }

    case 'LOG_MEALS_TODAY': {
      const { data } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', ctx.userId)
        .gte('created_at', startOfToday());
      const count = data?.length ?? 0;
      const goal = 3;
      return state(node, Math.min(1, count / goal));
    }

    case 'HIT_PROTEIN_GOAL': {
      const { data } = await supabase
        .from('meals')
        .select('protein')
        .eq('user_id', ctx.userId)
        .gte('created_at', startOfToday());
      const sum = (data ?? []).reduce((a: number, m: any) => a + (m.protein ?? 0), 0);
      const target = Math.max(30, ctx.proteinTarget ?? 100);
      return state(node, Math.min(1, sum / target));
    }

    case 'WEEK_STREAK_3':
    case 'WEEK_STREAK_7': {
      // Count consecutive days with ANY meal logged
      const days = node.type === 'WEEK_STREAK_3' ? 3 : 7;

      // Get meals from last 14 days
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const { data } = await supabase
        .from('meals')
        .select('created_at')
        .eq('user_id', ctx.userId)
        .gte('created_at', fourteenDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      // Calculate consecutive days
      const streak = calculateStreak(data ?? []);
      return state(node, Math.min(1, streak / days));
    }

    default:
      return state(node, 0);
  }
}

function calculateStreak(meals: Array<{ created_at: string }>): number {
  if (meals.length === 0) return 0;

  // Group by date
  const dates = new Set(
    meals.map(m => new Date(m.created_at).toISOString().split('T')[0])
  );

  const sortedDates = Array.from(dates).sort().reverse();

  // Check if today has a meal
  const today = new Date().toISOString().split('T')[0];
  if (!sortedDates.includes(today)) return 0;

  // Count consecutive days
  let streak = 1;
  const todayDate = new Date(today);

  for (let i = 1; i < sortedDates.length; i++) {
    const currentDate = new Date(sortedDates[i]);
    const expectedDate = new Date(todayDate);
    expectedDate.setDate(expectedDate.getDate() - streak);

    if (currentDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function state(node: JourneyNode, progress: number): UserNodeState {
  const status: 'LOCKED' | 'ACTIVE' | 'COMPLETED' =
    progress >= 1 ? 'COMPLETED' : 'ACTIVE';
  return {
    node_id: node.id,
    status,
    progress,
    updated_at: new Date().toISOString(),
  };
}
