/**
 * Israeli MoH Name Search Hook
 *
 * Provides debounced search functionality for the Israeli Ministry of Health
 * nutrition database with caching and request deduplication
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface IsraelMoHFood {
  id: number;
  name_he: string;
  name_en?: string;
  brand?: string;
  category?: string;
  calories_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
  sugars_g_per_100g?: number;
  sodium_mg_per_100g?: number;
  fiber_g_per_100g?: number;
  is_partial: boolean;
}

interface SearchResponse {
  ok: boolean;
  results?: IsraelMoHFood[];
  count?: number;
  error?: string;
}

interface UseIsraelSearchResult {
  results: IsraelMoHFood[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

// Simple in-memory cache with TTL
const searchCache = new Map<string, { results: IsraelMoHFood[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Normalize Hebrew text (remove diacritics, normalize spaces)
function normalizeHebrew(text: string): string {
  return text
    .trim()
    .replace(/[\u0591-\u05C7]/g, '') // Remove Hebrew diacritics
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Get from cache if not expired
function getCached(query: string): IsraelMoHFood[] | null {
  const normalizedQuery = normalizeHebrew(query);
  const cached = searchCache.get(normalizedQuery);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[IsraelSearch] Cache hit:', normalizedQuery);
    return cached.results;
  }

  if (cached) {
    searchCache.delete(normalizedQuery);
  }

  return null;
}

// Store in cache
function setCache(query: string, results: IsraelMoHFood[]): void {
  const normalizedQuery = normalizeHebrew(query);
  searchCache.set(normalizedQuery, {
    results,
    timestamp: Date.now(),
  });

  // Cleanup old entries if cache grows too large
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

export function useIsraelSearch(debounceMs: number = 300): UseIsraelSearchResult {
  const [results, setResults] = useState<IsraelMoHFood[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>('');

  const search = useCallback((query: string) => {
    const trimmedQuery = query.trim();

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Clear if empty query
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setResults([]);
      setError(null);
      setIsLoading(false);
      lastQueryRef.current = '';
      return;
    }

    // Check cache first
    const cached = getCached(trimmedQuery);
    if (cached) {
      setResults(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Debounce the API call
    debounceTimerRef.current = setTimeout(async () => {
      // Abort previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const currentQuery = trimmedQuery;
      lastQueryRef.current = currentQuery;

      try {
        console.log('[IsraelSearch] Searching:', currentQuery);

        const url = `/api/israel-moh/search?query=${encodeURIComponent(currentQuery)}`;
        console.log('[IsraelSearch] Fetching:', url);

        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
        });

        console.log('[IsraelSearch] Response status:', response.status);

        const data: SearchResponse = await response.json();
        console.log('[IsraelSearch] Response data:', data);

        // Only update if this is still the latest query
        if (currentQuery === lastQueryRef.current) {
          if (data.ok && data.results) {
            setResults(data.results);
            setCache(currentQuery, data.results);
            setError(null);
            console.log('[IsraelSearch] Found', data.count, 'results');
          } else {
            setResults([]);
            setError(data.error || 'Search failed');
            console.error('[IsraelSearch] API Error:', data.error);
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('[IsraelSearch] Request aborted');
          return;
        }

        // Only update if this is still the latest query
        if (currentQuery === lastQueryRef.current) {
          console.error('[IsraelSearch] Fetch error:', err);
          setError(err.message || 'Network error');
          setResults([]);
          setIsLoading(false);
        }
      }
    }, debounceMs);
  }, [debounceMs]);

  const clear = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
    results,
    isLoading,
    error,
    search,
    clear,
  };
}
