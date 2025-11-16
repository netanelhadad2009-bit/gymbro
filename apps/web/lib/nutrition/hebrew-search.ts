/**
 * Hebrew Food Search Utilities
 * Normalization, tokenization, and ranking for Israeli MoH food database
 */

// Hebrew stop words to filter out
const STOP_WORDS = new Set(['של', 'עם', 'ו', 'את', 'על', 'ב', 'ה', 'מ', 'כ', 'ל']);

// Joiners/qualifiers that indicate composite dishes
export const COMPOSITE_INDICATORS = [
  ',',
  ' עם ',
  ' ו',
  'בתיבול',
  'במילוי',
  'ברוטב',
  'מעורב',
  'מוקפץ',
  'מבושל עם',
  'ממולא',
  'תערובת',
  'סלט',
  'מרק',
  'תבשיל',
  'מנה',
];

// Basic food category keywords
export const BASIC_CATEGORIES = [
  'פרי',
  'פרות',
  'ירק',
  'ירקות',
  'בשר',
  'עוף',
  'דגים',
  'דג ',
  'ביצה',
  'ביצים',
  'לחם',
  'חלב',
  'גבינה',
  'קטניות',
  'דגן',
  'דגנים',
  'אורז',
  'פסטה',
];

// Synonym map for common Hebrew produce
export const HE_SYNONYMS: Record<string, string> = {
  תפוח: 'תפוח עץ',
  תפוחים: 'תפוח עץ',
  עגבניות: 'עגבניה',
  עגבנייה: 'עגבניה',
  עגבניה: 'עגבניה',
  בטטה: 'תפוח אדמה מתוק',
  בטטות: 'תפוח אדמה מתוק',
  מלפפון: 'מלפפון',
  מלפפונים: 'מלפפון',
  גזר: 'גזר',
  גזרים: 'גזר',
  בצל: 'בצל',
  בצלים: 'בצל',
  שום: 'שום',
  פלפל: 'פלפל',
  פלפלים: 'פלפל',
  בננה: 'בננה',
  בננות: 'בננה',
  תפוז: 'תפוז',
  תפוזים: 'תפוז',
  לימון: 'לימון',
  לימונים: 'לימון',
  חסה: 'חסה',
};

/**
 * Normalize Hebrew name for matching
 * - Remove Hebrew diacritics (nikud)
 * - Normalize whitespace
 * - Remove punctuation except spaces
 * - Lowercase English letters
 * - Trim
 */
export function normalizeHeName(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove Hebrew diacritics (nikud) - Unicode range U+0591 to U+05C7
      .replace(/[\u0591-\u05C7]/g, '')
      // Remove common punctuation but keep Hebrew letters and spaces
      .replace(/[.,\-()[\]{}:;"'!?״]/g, '')
      // Normalize whitespace to single spaces
      .replace(/\s+/g, ' ')
      // Lowercase any English letters
      .replace(/[A-Z]/g, (c) => c.toLowerCase())
      // Trim
      .trim()
  );
}

/**
 * Tokenize Hebrew text into words
 * - Normalize first
 * - Split by spaces
 * - Filter out stop words
 * - Remove empty tokens
 */
export function tokenizeHe(text: string): string[] {
  const normalized = normalizeHeName(text);
  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}

/**
 * Apply synonym mapping to a query
 */
export function applySynonyms(query: string): string {
  const normalized = normalizeHeName(query);
  return HE_SYNONYMS[normalized] || normalized;
}

/**
 * Check if a food name indicates a basic (single-ingredient) food
 * Based on:
 * 1. Token count (1-3 tokens, no composite indicators)
 * 2. Category keywords
 */
export function isBasicFood(name: string, category?: string): boolean {
  const normalized = normalizeHeName(name);
  const tokens = tokenizeHe(name);

  // Check if name contains composite indicators
  const hasCompositeIndicators = COMPOSITE_INDICATORS.some((indicator) =>
    normalized.includes(indicator)
  );

  // If has composite indicators, it's not basic
  if (hasCompositeIndicators) {
    return false;
  }

  // If 1-3 tokens and no composite indicators, it's likely basic
  if (tokens.length >= 1 && tokens.length <= 3) {
    return true;
  }

  // Check category for basic food keywords
  if (category) {
    const normalizedCategory = normalizeHeName(category);
    const hasBasicCategory = BASIC_CATEGORIES.some((cat) =>
      normalizedCategory.includes(cat)
    );
    if (hasBasicCategory) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate search score for a food item
 * Higher score = better match
 */
export interface ScoreFactors {
  exactMatch: number; // +60
  startsWithMatch: number; // +35
  tokenOverlap: number; // +25
  basicFoodBoost: number; // +20
  categoryBoost: number; // +10
  compositePenalty: number; // -20
}

export function calculateScore(
  foodName: string,
  foodCategory: string | undefined,
  query: string
): { score: number; factors: ScoreFactors } {
  const normQuery = normalizeHeName(query);
  const normName = normalizeHeName(foodName);
  const queryTokens = tokenizeHe(query);
  const nameTokens = tokenizeHe(foodName);

  const factors: ScoreFactors = {
    exactMatch: 0,
    startsWithMatch: 0,
    tokenOverlap: 0,
    basicFoodBoost: 0,
    categoryBoost: 0,
    compositePenalty: 0,
  };

  // Exact match bonus (+60)
  if (normName === normQuery) {
    factors.exactMatch = 60;
  }

  // Starts-with match on first token (+35)
  if (nameTokens.length > 0 && queryTokens.length > 0) {
    if (nameTokens[0].startsWith(queryTokens[0])) {
      factors.startsWithMatch = 35;
    }
  }

  // Token overlap bonus (+25)
  // Count how many query tokens appear in the name
  const overlapCount = queryTokens.filter((qt) =>
    nameTokens.some((nt) => nt.includes(qt) || qt.includes(nt))
  ).length;

  if (overlapCount > 0) {
    factors.tokenOverlap = Math.min(25, overlapCount * 10);
  }

  // Basic food boost (+20 for short queries)
  const isBasic = isBasicFood(foodName, foodCategory);
  if (isBasic && queryTokens.length <= 2) {
    factors.basicFoodBoost = 20;
  }

  // Category boost (+10)
  if (foodCategory) {
    const normCategory = normalizeHeName(foodCategory);
    const hasBasicCategory = BASIC_CATEGORIES.some((cat) =>
      normCategory.includes(cat)
    );
    if (hasBasicCategory) {
      factors.categoryBoost = 10;
    }
  }

  // Composite penalty (-20)
  if (!isBasic && COMPOSITE_INDICATORS.some((ind) => normName.includes(ind))) {
    factors.compositePenalty = -20;
  }

  const totalScore =
    factors.exactMatch +
    factors.startsWithMatch +
    factors.tokenOverlap +
    factors.basicFoodBoost +
    factors.categoryBoost +
    factors.compositePenalty;

  return { score: totalScore, factors };
}

/**
 * Sort food results by score
 */
export function rankFoodResults<T extends { name_he: string; category?: string }>(
  results: T[],
  query: string
): Array<T & { _score: number }> {
  const scored = results.map((food) => {
    const { score } = calculateScore(food.name_he, food.category, query);
    return {
      ...food,
      _score: score,
    };
  });

  // Sort by score DESC, then by name length ASC (shorter names first for ties)
  scored.sort((a, b) => {
    if (a._score !== b._score) {
      return b._score - a._score;
    }
    return a.name_he.length - b.name_he.length;
  });

  return scored;
}
