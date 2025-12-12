/**
 * Merge and Rank Algorithm
 * Combines results from multiple providers, deduplicates, and ranks by relevance
 */

import type { ProviderResult, Per100g } from './providers/base';
import { normalizeForDedup, isIncomplete } from './providers/base';
import { generateServingOptions, getDefaultServingId, type ServingOption } from './servings';

export interface FoodSearchResult {
  id: string;
  source: 'israeli_moh' | 'open_food_facts' | 'usda' | 'user';
  name: string;
  name_he?: string;
  brand?: string;
  per100g: Per100g;
  servings: ServingOption[];
  defaultServing: string;
  imageUrl?: string;
  isPartial?: boolean;
  lastUsed?: string;
}

interface ScoredResult {
  result: ProviderResult & { source: string };
  score: number;
}

/**
 * Score a result based on query match quality
 */
function scoreResult(result: ProviderResult & { source: string }, query: string): number {
  let score = 0;
  const lowerQuery = query.toLowerCase().trim();
  const lowerName = result.name.toLowerCase();
  const lowerNameHe = result.name_he?.toLowerCase() || '';

  // Exact match (highest priority)
  if (lowerName === lowerQuery || lowerNameHe === lowerQuery) {
    score += 100;
  }

  // Starts with query (high priority)
  if (lowerName.startsWith(lowerQuery) || lowerNameHe.startsWith(lowerQuery)) {
    score += 50;
  }

  // Contains query (medium priority)
  if (lowerName.includes(lowerQuery)) {
    score += 25;
  }
  if (lowerNameHe.includes(lowerQuery)) {
    score += 20;
  }

  // Brand match bonus
  if (result.brand) {
    score += 5;
    const lowerBrand = result.brand.toLowerCase();
    if (lowerBrand.includes(lowerQuery)) {
      score += 15;
    }
  }

  // Complete nutrition data bonus
  if (!isIncomplete(result.per100g)) {
    score += 10;
  }

  // Image bonus
  if (result.imageUrl) {
    score += 3;
  }

  // Source priority (prefer local/verified sources)
  if (result.source === 'israeli_moh') {
    score += 8; // Prefer Israeli MoH (verified government data)
  } else if (result.source === 'user') {
    score += 7; // User's own foods
  } else if (result.source === 'usda') {
    score += 6; // USDA (verified government data)
  } else if (result.source === 'open_food_facts') {
    score += 5; // Open Food Facts (community data)
  }

  return score;
}

/**
 * Deduplicate results by name+brand similarity
 */
function deduplicateResults(results: (ProviderResult & { source: string })[]): (ProviderResult & { source: string })[] {
  const seen = new Map<string, ProviderResult & { source: string }>();

  for (const result of results) {
    const key = normalizeForDedup(result.name, result.brand);

    const existing = seen.get(key);
    if (!existing) {
      // First occurrence of this food
      seen.set(key, result);
    } else {
      // Duplicate found - keep the better one
      // Prefer: complete data > has image > verified source
      const existingComplete = !isIncomplete(existing.per100g);
      const resultComplete = !isIncomplete(result.per100g);

      let shouldReplace = false;

      if (resultComplete && !existingComplete) {
        shouldReplace = true; // Prefer complete nutrition
      } else if (resultComplete === existingComplete) {
        // Both complete or both incomplete - check other factors
        if (result.imageUrl && !existing.imageUrl) {
          shouldReplace = true; // Prefer with image
        } else if ((result.imageUrl && existing.imageUrl) || (!result.imageUrl && !existing.imageUrl)) {
          // Both have image or both don't - prefer better source
          const sourceRank = { israeli_moh: 4, user: 3, usda: 2, open_food_facts: 1 };
          const existingRank = sourceRank[existing.source as keyof typeof sourceRank] || 0;
          const resultRank = sourceRank[result.source as keyof typeof sourceRank] || 0;
          if (resultRank > existingRank) {
            shouldReplace = true;
          }
        }
      }

      if (shouldReplace) {
        seen.set(key, result);
      }
    }
  }

  return Array.from(seen.values());
}

/**
 * Merge and rank results from multiple providers
 */
export function mergeAndRankResults(
  providerResults: Map<string, ProviderResult[]>,
  query: string
): FoodSearchResult[] {
  // 1. Flatten all results with source attribution
  const allResults: (ProviderResult & { source: string })[] = [];
  for (const [source, results] of providerResults.entries()) {
    for (const result of results) {
      allResults.push({ ...result, source });
    }
  }

  if (allResults.length === 0) {
    return [];
  }

  // 2. Deduplicate by name+brand similarity
  const deduped = deduplicateResults(allResults);

  // 3. Score each result
  const scored: ScoredResult[] = deduped.map(result => ({
    result,
    score: scoreResult(result, query),
  }));

  // 4. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // 5. Convert to FoodSearchResult with servings
  return scored.map(({ result }) => {
    const servings = generateServingOptions(result);
    const defaultServing = getDefaultServingId(result);

    return {
      id: `${result.source}:${result.id}`,
      source: result.source as any,
      name: result.name,
      name_he: result.name_he,
      brand: result.brand,
      per100g: result.per100g,
      servings,
      defaultServing,
      imageUrl: result.imageUrl,
      isPartial: isIncomplete(result.per100g),
    };
  });
}

/**
 * Separate recent foods from database results
 * Recent foods are those from user provider with recent usage
 */
export function separateRecentResults(
  results: FoodSearchResult[],
  maxRecent: number = 5
): { recent: FoodSearchResult[]; database: FoodSearchResult[] } {
  const recent: FoodSearchResult[] = [];
  const database: FoodSearchResult[] = [];

  for (const result of results) {
    if (result.lastUsed) {
      recent.push(result);
    } else {
      database.push(result);
    }
  }

  // Limit recent results
  return {
    recent: recent.slice(0, maxRecent),
    database,
  };
}
