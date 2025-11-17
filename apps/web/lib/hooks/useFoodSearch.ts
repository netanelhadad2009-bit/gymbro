/**
 * Food Search Hook
 * Provides debounced search for food databases with caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface FoodSearchResult {
  id: string;
  name_he: string;
  name_en?: string | null;
  brand?: string | null;
  category?: string | null;
  calories_per_100g?: number | null;
  protein_g_per_100g?: number | null;
  carbs_g_per_100g?: number | null;
  fat_g_per_100g?: number | null;
  sugars_g_per_100g?: number | null;
  sodium_mg_per_100g?: number | null;
  fiber_g_per_100g?: number | null;
  is_partial?: boolean;
  source?: 'manual' | 'moh' | 'logged';
}

interface SearchResponse {
  ok: boolean;
  results?: FoodSearchResult[];
  count?: number;
  error?: string;
}

export type FoodFilterType = 'all' | 'basic' | 'prepared';

interface UseFoodSearchResult {
  query: string;
  setQuery: (q: string) => void;
  filter: FoodFilterType;
  setFilter: (f: FoodFilterType) => void;
  results: FoodSearchResult[];
  isLoading: boolean;
  error: string | null;
  clear: () => void;
}

// Simple in-memory cache with TTL
const searchCache = new Map<string, { results: FoodSearchResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function normalizeQuery(text: string): string {
  return text
    .trim()
    .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function getCacheKey(query: string, filter: FoodFilterType): string {
  return `${normalizeQuery(query)}__${filter}`;
}

function getCached(query: string, filter: FoodFilterType): FoodSearchResult[] | null {
  const cacheKey = getCacheKey(query, filter);
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[FoodSearch] Cache hit:', cacheKey);
    return cached.results;
  }

  if (cached) {
    searchCache.delete(cacheKey);
  }

  return null;
}

function setCache(query: string, filter: FoodFilterType, results: FoodSearchResult[]): void {
  const cacheKey = getCacheKey(query, filter);
  searchCache.set(cacheKey, {
    results,
    timestamp: Date.now(),
  });

  // Cleanup old entries
  if (searchCache.size > 100) {
    const now = Date.now();
    const keysToDelete: string[] = [];

    searchCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => searchCache.delete(key));
  }
}

export function useFoodSearch(
  initialQuery: string = '',
  debounceMs: number = 300,
  source: string = 'israel_moh',
  initialFilter: FoodFilterType = 'all'
): UseFoodSearchResult {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<FoodFilterType>(initialFilter);
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>('');
  const lastFilterRef = useRef<FoodFilterType>(initialFilter);

  const performSearch = useCallback(async (searchQuery: string, searchFilter: FoodFilterType) => {
    const trimmed = searchQuery.trim();

    if (!trimmed || trimmed.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      lastQueryRef.current = '';
      return;
    }

    // Check cache
    const cached = getCached(trimmed, searchFilter);
    if (cached) {
      setResults(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    lastQueryRef.current = trimmed;
    lastFilterRef.current = searchFilter;

    try {
      console.log('[FoodSearch] search q=', trimmed, 'filter=', searchFilter);

      const endpoint = source === 'israel_moh'
        ? `/api/israel-moh/search?query=${encodeURIComponent(trimmed)}&filter=${searchFilter}`
        : `/api/food/search?query=${encodeURIComponent(trimmed)}&filter=${searchFilter}`;

      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
      });

      const data: SearchResponse = await response.json();

      if (trimmed === lastQueryRef.current && searchFilter === lastFilterRef.current) {
        if (data.ok && data.results) {
          setResults(data.results);
          setCache(trimmed, searchFilter, data.results);
          setError(null);
          console.log('[FoodSearch] Found', data.count, 'results');
        } else {
          setResults([]);
          setError(data.error || 'Search failed');
          console.error('[FoodSearch] API Error:', data.error);
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[FoodSearch] Request aborted');
        return;
      }

      if (trimmed === lastQueryRef.current && searchFilter === lastFilterRef.current) {
        console.error('[FoodSearch] Fetch error:', err);
        setError(err.message || 'Network error');
        setResults([]);
        setIsLoading(false);
      }
    }
  }, [source]);

  // Debounced search effect - trigger when query or filter changes
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query, filter);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, filter, debounceMs, performSearch]);

  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setQuery('');
    setFilter('all');
    setResults([]);
    setError(null);
    setIsLoading(false);
    lastQueryRef.current = '';
    lastFilterRef.current = 'all';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    results,
    isLoading,
    error,
    clear,
  };
}

// Helper formatters
export const fmtG = (n?: number | null) => (n ?? 0).toFixed(1);
export const fmtKcal = (n?: number | null) => Math.round(n ?? 0);
