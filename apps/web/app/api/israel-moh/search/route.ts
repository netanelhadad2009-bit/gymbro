/**
 * Israeli MoH Name Search API with Intelligent Ranking
 * GET /api/israel-moh/search?query=<name>&filter=(all|basic|prepared)
 *
 * Searches the Israeli Ministry of Health nutrition database by product name
 * with smart ranking that prioritizes basic foods over composite dishes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  normalizeHeName,
  tokenizeHe,
  applySynonyms,
  rankFoodResults,
  isBasicFood,
} from '@/lib/nutrition/hebrew-search';

// Minimum query length
const MIN_QUERY_LENGTH = 2;

// Maximum results to fetch from DB (we'll rank and filter these)
const MAX_DB_RESULTS = 100;

// Maximum results to return to client
const MAX_RETURN_RESULTS = 30;

type FilterType = 'all' | 'basic' | 'prepared';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const filterParam = searchParams.get('filter') || 'all';

    // Validate filter
    const filter: FilterType = ['all', 'basic', 'prepared'].includes(filterParam)
      ? (filterParam as FilterType)
      : 'all';

    // Validate query
    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `Query must be at least ${MIN_QUERY_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    const normalizedQuery = normalizeHeName(query);
    const queryWithSynonyms = applySynonyms(query);
    const queryTokens = tokenizeHe(query);

    console.log('[IsraelSearch] Query:', query);
    console.log('[IsraelSearch] Normalized:', normalizedQuery);
    console.log('[IsraelSearch] With synonyms:', queryWithSynonyms);
    console.log('[IsraelSearch] Tokens:', queryTokens);
    console.log('[IsraelSearch] Filter:', filter);

    const supabase = await createClient();

    // Build search query using ILIKE for broad matching
    // We'll fetch more results and rank them client-side
    const firstToken = queryTokens[0] || normalizedQuery;

    // Try multiple search strategies and combine results
    const searchQueries = [
      // Exact match on normalized name
      supabase
        .from('israel_moh_foods')
        .select(
          'id, name_he, name_en, brand, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugars_g_per_100g, sodium_mg_per_100g, fiber_g_per_100g, is_partial'
        )
        .ilike('name_he', `%${normalizedQuery}%`)
        .limit(MAX_DB_RESULTS),

      // Search by first token if different from full query
      ...(queryTokens.length > 1
        ? [
            supabase
              .from('israel_moh_foods')
              .select(
                'id, name_he, name_en, brand, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugars_g_per_100g, sodium_mg_per_100g, fiber_g_per_100g, is_partial'
              )
              .ilike('name_he', `%${firstToken}%`)
              .limit(50),
          ]
        : []),

      // Search by synonym if different
      ...(queryWithSynonyms !== normalizedQuery
        ? [
            supabase
              .from('israel_moh_foods')
              .select(
                'id, name_he, name_en, brand, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, sugars_g_per_100g, sodium_mg_per_100g, fiber_g_per_100g, is_partial'
              )
              .ilike('name_he', `%${queryWithSynonyms}%`)
              .limit(50),
          ]
        : []),
    ];

    // Execute all queries in parallel
    const results = await Promise.all(searchQueries);

    // Combine and deduplicate results
    const allResults: any[] = [];
    const seenIds = new Set<number>();

    for (const { data, error } of results) {
      if (error) {
        console.error('[IsraelSearch] Query error:', error);
        continue;
      }

      if (data) {
        for (const item of data) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            allResults.push(item);
          }
        }
      }
    }

    console.log(`[IsraelSearch] Fetched ${allResults.length} raw results`);

    if (allResults.length === 0) {
      return NextResponse.json(
        {
          ok: true,
          results: [],
          count: 0,
        },
        {
          headers: {
            'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
          },
        }
      );
    }

    // Apply intelligent ranking
    const rankedResults = rankFoodResults(allResults, query);

    console.log('[IsraelSearch] Ranked results (top 10):');
    rankedResults.slice(0, 10).forEach((r, i) => {
      console.log(`  ${i + 1}. [score=${r._score}] ${r.name_he}`);
    });

    // Apply filter
    let filteredResults = rankedResults;

    if (filter === 'basic') {
      filteredResults = rankedResults.filter((r) => isBasicFood(r.name_he, r.category));
      console.log(`[IsraelSearch] Filtered to ${filteredResults.length} basic foods`);
    } else if (filter === 'prepared') {
      filteredResults = rankedResults.filter((r) => !isBasicFood(r.name_he, r.category));
      console.log(`[IsraelSearch] Filtered to ${filteredResults.length} prepared foods`);
    }

    // Take top N results
    const finalResults = filteredResults.slice(0, MAX_RETURN_RESULTS);

    // Remove _score field before returning
    const cleanResults = finalResults.map(({ _score, ...rest }) => rest);

    console.log(`[IsraelSearch] Returning ${cleanResults.length} results`);
    console.log('[IsraelSearch] Top 5 names:', cleanResults.slice(0, 5).map((r) => r.name_he));

    return NextResponse.json(
      {
        ok: true,
        results: cleanResults,
        count: cleanResults.length,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error: any) {
    console.error('[IsraelSearch] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
