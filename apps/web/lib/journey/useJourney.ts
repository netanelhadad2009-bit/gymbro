import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { JourneyNode, UserNodeState } from './types';
import { evalNodeProgress } from './rules';

// Demo data fallback
const DEMO_NODES: JourneyNode[] = [
  {
    id: 'demo-1',
    order: 0,
    chapter: 'BASICS',
    type: 'FIRST_WEIGH_IN',
    title: 'שקילה ראשונה',
    subtitle: 'תעד את המשקל הנוכחי שלך',
    points: 10,
  },
  {
    id: 'demo-2',
    order: 1,
    chapter: 'BASICS',
    type: 'LOG_MEALS_TODAY',
    title: 'תיעוד ארוחות',
    subtitle: 'תעד 3 ארוחות היום',
    points: 20,
  },
  {
    id: 'demo-3',
    order: 2,
    chapter: 'BASICS',
    type: 'HIT_PROTEIN_GOAL',
    title: 'יעד חלבון',
    subtitle: 'השג את יעד החלבון היומי',
    points: 30,
  },
  {
    id: 'demo-4',
    order: 3,
    chapter: 'ADVANCED',
    type: 'WEEK_STREAK_3',
    title: 'רצף 3 ימים',
    subtitle: 'תעד ארוחות 3 ימים ברצף',
    points: 40,
  },
];

export function useJourney() {
  const [nodes, setNodes] = useState<JourneyNode[]>([]);
  const [states, setStates] = useState<Record<string, UserNodeState>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<unknown>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        setUserId(user.id);

        // 1) Fetch static nodes (from /api/journey or use demo data)
        let list: JourneyNode[] = [];

        try {
          const res = await fetch('/api/journey');
          if (res.ok) {
            const json = await res.json();

            // Map the API response to our JourneyNode type
            list = (json.chapters || []).flatMap(
              (chapter: any, chapterIdx: number) =>
                (chapter.nodes || []).map((node: any, nodeIdx: number) => ({
                  id: node.id.toString(),
                  order: chapterIdx * 100 + nodeIdx,
                  chapter: chapterIdx === 0 ? 'BASICS' : 'ADVANCED',
                  type: mapNodeType(node.title),
                  title: node.title,
                  subtitle: node.description,
                  points: node.points || 10,
                }))
            );
          }
        } catch (apiError) {
          console.warn('[useJourney] API fetch failed, using demo data:', apiError);
        }

        // Fallback to demo data if API returned empty or failed
        if (list.length === 0) {
          console.log('[useJourney] Using demo data');
          list = DEMO_NODES;
        }

        // 2) Progressive evaluation with gating
        const results: Record<string, UserNodeState> = {};
        for (let i = 0; i < list.length; i++) {
          const node = list[i];

          // Gate: everything after the first unfinished node = LOCKED
          const locked = list
            .slice(0, i)
            .some(n => results[n.id]?.status !== 'COMPLETED');
          if (locked) {
            results[node.id] = {
              node_id: node.id,
              status: 'LOCKED',
              progress: 0,
              updated_at: new Date().toISOString(),
            };
            continue;
          }

          results[node.id] = await evalNodeProgress(node, { userId: user.id });
        }

        if (!cancelled) {
          setNodes(list);
          setStates(results);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('[useJourney] Error:', e);
          setErr(e);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Derived: find the active node index
  const activeIndex = useMemo(() => {
    const ordered = [...nodes].sort((a, b) => a.order - b.order);
    for (let i = 0; i < ordered.length; i++) {
      const st = states[ordered[i].id];
      if (st?.status !== 'COMPLETED') return i;
    }
    return ordered.length - 1;
  }, [nodes, states]);

  return { nodes, states, activeIndex, loading, error: err, userId };
}

/**
 * Extract header-specific data from journey state
 */
export function useJourneyHeader() {
  const { nodes, states, loading, error } = useJourney();

  // Calculate total points earned
  const points = useMemo(() => {
    return nodes.reduce((sum, node) => {
      const completed = states[node.id]?.status === 'COMPLETED';
      return sum + (completed ? node.points : 0);
    }, 0);
  }, [nodes, states]);

  // Calculate completed and total nodes
  const { completed, total } = useMemo(() => {
    const completedCount = nodes.filter(n => states[n.id]?.status === 'COMPLETED').length;
    return { completed: completedCount, total: nodes.length };
  }, [nodes, states]);

  // Calculate progress percentage
  const progress = useMemo(() => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [completed, total]);

  // Get current chapter name (from active or last completed node)
  const chapterName = useMemo(() => {
    const activeNode = nodes.find(n => {
      const state = states[n.id];
      return state?.status === 'ACTIVE' || (state?.status !== 'COMPLETED' && state?.status !== 'LOCKED');
    });

    const chapter = activeNode?.chapter || nodes[0]?.chapter || 'BASICS';

    // Map chapter codes to Hebrew names
    const chapterNames: Record<string, string> = {
      'BASICS': 'שלב הבסיסים',
      'ADVANCED': 'שלב מתקדם',
      'EXPERT': 'שלב המומחים'
    };

    return chapterNames[chapter] || 'שלב הבסיסים';
  }, [nodes, states]);

  // Calculate streak (simplified - count consecutive days with activity)
  // TODO: Wire to real backend streak calculation
  const streak = 0; // Placeholder

  return {
    points,
    streak,
    chapterName,
    progress,
    completed,
    total,
    loading,
    error
  };
}

// Helper to map node titles to NodeType enum
function mapNodeType(title: string): any {
  const lower = title.toLowerCase();
  if (lower.includes('weigh') || lower.includes('שקילה')) return 'FIRST_WEIGH_IN';
  if (lower.includes('meal') || lower.includes('ארוחות')) return 'LOG_MEALS_TODAY';
  if (lower.includes('protein') || lower.includes('חלבון')) return 'HIT_PROTEIN_GOAL';
  if (lower.includes('3') || lower.includes('שלושה')) return 'WEEK_STREAK_3';
  if (lower.includes('7') || lower.includes('שבעה')) return 'WEEK_STREAK_7';
  return 'FIRST_WEIGH_IN'; // default
}
