import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateBody, RateLimitPresets, ErrorResponses, handleApiError } from '@/lib/api/security';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { IsraeliMoHProvider } from '@/lib/food-search/providers/israeli-moh';
import { OpenFoodFactsProvider } from '@/lib/food-search/providers/open-food-facts';
import { USDAProvider } from '@/lib/food-search/providers/usda';
import { UserFoodsProvider } from '@/lib/food-search/providers/user-foods';
import { mergeAndRankResults } from '@/lib/food-search/merge';
import type { FoodProvider, ProviderResult } from '@/lib/food-search/providers/base';

export const dynamic = 'force-dynamic';

const SearchRequestSchema = z.object({
  query: z.string().min(2, 'Query must be at least 2 characters').max(100, 'Query too long'),
  limit: z.number().int().min(1).max(50).optional().default(30),
  includeRecent: z.boolean().optional().default(true),
});

/**
 * Get user ID from request (optional - returns null if not authenticated)
 */
async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch (error) {
    console.error('[FoodSearch] Error getting user ID:', error);
    return null;
  }
}

/**
 * POST /api/food/search
 * Unified food database search across multiple providers
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimit = await checkRateLimit(request, {
      ...RateLimitPresets.search,
      keyPrefix: 'food-search',
    });

    if (!rateLimit.allowed) {
      console.log('[FoodSearch] Rate limit exceeded');
      return ErrorResponses.rateLimited(rateLimit.resetAt, rateLimit.limit);
    }

    // Validate request body
    const validation = await validateBody(request, SearchRequestSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { query, limit, includeRecent } = validation.data;

    console.log(`[FoodSearch] Searching for: "${query}" (limit: ${limit})`);

    // Get user ID (optional - searches work without auth)
    const userId = await getUserId();

    // Initialize providers
    const providers: FoodProvider[] = [
      new IsraeliMoHProvider(),
      new OpenFoodFactsProvider(),
      new USDAProvider(),
    ];

    // Add user foods provider if authenticated
    if (userId && includeRecent) {
      providers.push(new UserFoodsProvider(userId));
    }

    // Query all providers in parallel
    const providerPromises = providers
      .filter(p => p.supports(query))
      .map(async (provider) => {
        try {
          const startTime = Date.now();
          const results = await provider.search(query, limit ?? 30);
          const duration = Date.now() - startTime;
          console.log(`[FoodSearch] ${provider.name}: ${results.length} results (${duration}ms)`);
          return { provider: provider.name, results };
        } catch (error) {
          console.error(`[FoodSearch] Provider ${provider.name} failed:`, error);
          return { provider: provider.name, results: [] };
        }
      });

    const providerResults = await Promise.all(providerPromises);

    // Convert to Map
    const resultsMap = new Map<string, ProviderResult[]>();
    const activeSources: string[] = [];

    for (const { provider, results } of providerResults) {
      if (results.length > 0) {
        resultsMap.set(provider, results);
        activeSources.push(provider);
      }
    }

    // Merge and rank
    const mergedResults = mergeAndRankResults(resultsMap, query);

    // Separate recent vs database results
    let recentResults = mergedResults.filter(r => r.lastUsed);
    let databaseResults = mergedResults.filter(r => !r.lastUsed);

    // Limit recent results
    if (recentResults.length > 5) {
      recentResults = recentResults.slice(0, 5);
    }

    // Limit database results
    const effectiveLimit = limit ?? 30;
    if (databaseResults.length > effectiveLimit) {
      databaseResults = databaseResults.slice(0, effectiveLimit);
    }

    console.log(`[FoodSearch] Returning: ${recentResults.length} recent, ${databaseResults.length} database`);

    return NextResponse.json({
      ok: true,
      results: {
        recent: includeRecent ? recentResults : [],
        database: databaseResults,
      },
      sources: activeSources,
    });
  } catch (error) {
    console.error('[FoodSearch] Fatal error:', error);
    return handleApiError(error, 'FoodSearch');
  }
}
