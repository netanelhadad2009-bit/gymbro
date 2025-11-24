/**
 * My Foods Search Hook
 * Provides debounced search for user's manually added and recently logged foods
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { MyFoodResult } from '@/types/my-foods';

interface SearchResponse {
  ok: boolean;
  results?: MyFoodResult[];
  count?: number;
  error?: string;
}

interface UseMyFoodsSearchResult {
  query: string;
  setQuery: (q: string) => void;
  results: MyFoodResult[];
  isLoading: boolean;
  error: string | null;
  clear: () => void;
}

// Simple in-memory cache with TTL
const searchCache = new Map<string, { results: MyFoodResult[]; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (shorter for user-specific data)

function normalizeQuery(text: string): string {
  return text
    .trim()
    .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function getCacheKey(query: string): string {
  return normalizeQuery(query);
}

function getCached(query: string): MyFoodResult[] | null {
  const cacheKey = getCacheKey(query);
  const cached = searchCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[MyFoodsSearch] Cache hit:', cacheKey);
    return cached.results;
  }

  if (cached) {
    searchCache.delete(cacheKey);
  }

  return null;
}

function setCache(query: string, results: MyFoodResult[]): void {
  const cacheKey = getCacheKey(query);
  searchCache.set(cacheKey, {
    results,
    timestamp: Date.now(),
  });

  // Cleanup old entries
  if (searchCache.size > 50) {
    const now = Date.now();
    const keysToDelete: string[] = [];

    searchCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => searchCache.delete(key));
  }
}

export function useMyFoodsSearch(
  initialQuery: string = '',
  debounceMs: number = 300
): UseMyFoodsSearchResult {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MyFoodResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>('');
  const isInitialMount = useRef(true);

  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();

    // Always fetch recent items, even for empty query
    // Check cache
    const cached = getCached(trimmed);
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

    try {
      console.log('[MyFoodsSearch] Fetching q=', trimmed);

      const endpoint = `/api/my-foods/search${trimmed ? `?q=${encodeURIComponent(trimmed)}` : ''}`;

      const response = await fetch(endpoint, {
        signal: abortControllerRef.current.signal,
      });

      const data: SearchResponse = await response.json();

      if (trimmed === lastQueryRef.current) {
        if (data.ok && data.results) {
          setResults(data.results);
          setCache(trimmed, data.results);
          setError(null);
          console.log('[MyFoodsSearch] Found', data.count, 'results');
        } else {
          setResults([]);
          setError(data.error || 'Search failed');
          console.error('[MyFoodsSearch] API Error:', data.error);
        }
        setIsLoading(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('[MyFoodsSearch] Request aborted');
        return;
      }

      if (trimmed === lastQueryRef.current) {
        console.error('[MyFoodsSearch] Fetch error:', err);
        setError(err.message || 'Network error');
        setResults([]);
        setIsLoading(false);
      }
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // On initial mount, fetch immediately without debounce
    if (isInitialMount.current) {
      isInitialMount.current = false;
      console.log('[MyFoodsSearch] Initial mount - fetching immediately');
      performSearch(query);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, performSearch]);

  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
    lastQueryRef.current = '';
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
    results,
    isLoading,
    error,
    clear,
  };
}
