/**
 * Journey Builder - Persona-driven journey plan generation
 *
 * This module creates personalized journey plans based on user persona
 * (gender, goal, diet, training frequency, experience level).
 */

/**
 * User persona derived from onboarding data and profile
 */
export type Persona = {
  gender: 'male' | 'female';
  goal: 'recomp' | 'cut' | 'bulk' | string;
  diet: 'none' | 'vegan' | 'vegetarian' | 'keto' | 'paleo' | string;
  frequency: 'low' | 'medium' | 'high' | string;
  experience: 'beginner' | 'intermediate' | 'advanced' | string;
};

/**
 * Journey chapter grouping nodes by theme
 */
export type JourneyChapter = {
  id: string;
  name: string;
  order: number;
  nodes: JourneyNode[];
};

/**
 * Individual journey node/milestone
 */
export type JourneyNode = {
  id: string;
  type: string;
  title: string;
  description?: string;
  points: number;
  order: number;
  chapter_id: string;
  metadata?: Record<string, any>;
};

/**
 * Build a personalized journey plan from user persona
 *
 * @param persona User persona (gender, goal, diet, frequency, experience)
 * @returns Journey plan with chapters and nodes
 *
 * @example
 * const plan = buildJourneyFromPersona({
 *   gender: 'male',
 *   goal: 'recomp',
 *   diet: 'vegan',
 *   frequency: 'medium',
 *   experience: 'beginner'
 * });
 */
export function buildJourneyFromPersona(persona: Persona): {
  chapters: JourneyChapter[];
  nodes: JourneyNode[];
} {
  const nodes: JourneyNode[] = [];
  let order = 0;

  // BASICS: Foundation nodes (always included)
  const basicsNodes: JourneyNode[] = [];

  // 1. First weigh-in (always first)
  basicsNodes.push(
    node({
      id: 'weigh_in_today',
      type: 'FIRST_WEIGH_IN',
      title: 'שקילה ראשונה',
      description: 'תעד את המשקל הנוכחי שלך',
      points: 10,
      order: order++,
      chapter_id: 'basics',
    })
  );

  // 2. Log meals (always included)
  basicsNodes.push(
    node({
      id: 'log_2_meals',
      type: 'LOG_MEALS_TODAY',
      title: 'תיעוד ארוחות',
      description: 'תעד לפחות 2 ארוחות היום',
      points: 15,
      order: order++,
      chapter_id: 'basics',
    })
  );

  // 3. Protein target (gender-specific)
  const proteinTarget = persona.gender === 'male' ? 120 : 90;
  basicsNodes.push(
    nodeWithThreshold({
      id: 'protein_min',
      type: 'HIT_PROTEIN_GOAL',
      title: 'יעד חלבון',
      description: `השג יעד של ${proteinTarget}g חלבון ליום`,
      points: 20,
      order: order++,
      chapter_id: 'basics',
      metadata: {
        threshold: proteinTarget,
        nutrient: 'protein',
      },
    })
  );

  // ADVANCED: Goal-specific nodes
  const advancedNodes: JourneyNode[] = [];

  // 4. Calorie targets based on goal
  if (persona.goal === 'cut') {
    advancedNodes.push(
      node({
        id: 'cal_deficit_day',
        type: 'CALORIE_DEFICIT',
        title: 'גירעון קלורי',
        description: 'השג גירעון קלורי ליום אחד',
        points: 25,
        order: order++,
        chapter_id: 'advanced',
      })
    );
  } else if (persona.goal === 'bulk') {
    advancedNodes.push(
      node({
        id: 'cal_surplus_day',
        type: 'CALORIE_SURPLUS',
        title: 'עודף קלורי',
        description: 'השג עודף קלורי ליום אחד',
        points: 25,
        order: order++,
        chapter_id: 'advanced',
      })
    );
  }

  // 5. Diet-specific nodes
  if (persona.diet === 'vegan') {
    advancedNodes.push(
      node({
        id: 'vegan_protein_sources',
        type: 'VEGAN_PROTEIN',
        title: 'מקורות חלבון טבעוניים',
        description: 'צרוך 3 מקורות חלבון טבעוניים שונים',
        points: 20,
        order: order++,
        chapter_id: 'advanced',
      })
    );
  } else if (persona.diet === 'keto') {
    advancedNodes.push(
      nodeWithThreshold({
        id: 'keto_day',
        type: 'KETO_COMPLIANT',
        title: 'יום קטוגני',
        description: 'שמור על פחות מ-30g פחמימות ליום',
        points: 30,
        order: order++,
        chapter_id: 'advanced',
        metadata: {
          threshold: 30,
          nutrient: 'carbs',
          operator: 'lte',
        },
      })
    );
  }

  // 6. Training frequency nodes
  if (persona.frequency === 'high' || persona.experience !== 'beginner') {
    advancedNodes.push(
      node({
        id: 'workout_3x_week',
        type: 'WORKOUT_FREQUENCY',
        title: 'אימונים שבועיים',
        description: 'השלם 3 אימונים בשבוע',
        points: 35,
        order: order++,
        chapter_id: 'advanced',
      })
    );
  }

  // 7. Experience-based challenges
  if (persona.experience === 'intermediate' || persona.experience === 'advanced') {
    advancedNodes.push(
      node({
        id: 'week_streak_7',
        type: 'WEEK_STREAK_7',
        title: 'רצף שבועי',
        description: 'תעד ארוחות 7 ימים ברצף',
        points: 50,
        order: order++,
        chapter_id: 'advanced',
      })
    );
  }

  // Combine all nodes
  const allNodes = [...basicsNodes, ...advancedNodes];

  // Group into chapters
  const chapters = groupIntoChapters(allNodes);

  return { chapters, nodes: allNodes };
}

/**
 * Create a basic journey node
 */
function node(config: {
  id: string;
  type: string;
  title: string;
  description?: string;
  points: number;
  order: number;
  chapter_id: string;
  metadata?: Record<string, any>;
}): JourneyNode {
  return {
    id: config.id,
    type: config.type,
    title: config.title,
    description: config.description,
    points: config.points,
    order: config.order,
    chapter_id: config.chapter_id,
    metadata: config.metadata,
  };
}

/**
 * Create a journey node with a threshold/target value
 */
function nodeWithThreshold(config: {
  id: string;
  type: string;
  title: string;
  description?: string;
  points: number;
  order: number;
  chapter_id: string;
  metadata: {
    threshold: number;
    nutrient?: string;
    operator?: 'gte' | 'lte' | 'eq';
    [key: string]: any;
  };
}): JourneyNode {
  return node({
    ...config,
    metadata: {
      ...config.metadata,
      operator: config.metadata.operator || 'gte',
    },
  });
}

/**
 * Group nodes into themed chapters
 */
function groupIntoChapters(nodes: JourneyNode[]): JourneyChapter[] {
  const chapterMap = new Map<string, JourneyNode[]>();

  // Group nodes by chapter_id
  for (const node of nodes) {
    const existing = chapterMap.get(node.chapter_id) || [];
    existing.push(node);
    chapterMap.set(node.chapter_id, existing);
  }

  // Create chapter objects with stable ordering
  const chapters: JourneyChapter[] = [];
  const chapterOrder = ['basics', 'advanced', 'expert'];

  chapterOrder.forEach((chapterId, index) => {
    const chapterNodes = chapterMap.get(chapterId);
    if (chapterNodes && chapterNodes.length > 0) {
      chapters.push({
        id: chapterId,
        name: getChapterName(chapterId),
        order: index,
        nodes: chapterNodes.sort((a, b) => a.order - b.order),
      });
    }
  });

  return chapters;
}

/**
 * Get Hebrew chapter name
 */
function getChapterName(chapterId: string): string {
  const names: Record<string, string> = {
    basics: 'שלב הבסיסים',
    advanced: 'שלב מתקדם',
    expert: 'שלב המומחים',
  };
  return names[chapterId] || chapterId;
}

/**
 * Helper to derive persona from user metadata
 * Used as fallback when avatar doesn't exist
 */
export function derivePersonaFromMetadata(metadata: any = {}): Persona {
  // Import normalizers dynamically to avoid circular deps
  const {
    normalizeGender,
    normalizeGoal,
    normalizeDiet,
    normalizeFrequency,
    normalizeExperience,
  } = require('@/lib/persona/normalize');

  return {
    gender: normalizeGender(metadata.gender),
    goal: normalizeGoal(Array.isArray(metadata.goals) ? metadata.goals[0] : metadata.goal),
    diet: normalizeDiet(metadata.diet),
    frequency: normalizeFrequency(metadata.training_frequency_actual || metadata.frequency),
    experience: normalizeExperience(metadata.experience),
  };
}
