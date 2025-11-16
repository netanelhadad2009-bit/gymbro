/**
 * usePoints - React hooks for points data
 *
 * Provides hooks for fetching points summary and feed
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface StagePoints {
  stageId: string;
  stageTitle: string;
  points: number;
  completedTasks: number;
}

export interface PointsSummary {
  total: number;
  byStage: StagePoints[];
}

export interface PointsFeedItem {
  id: string;
  points: number;
  reason: string;
  stageId: string | null;
  stageTitle: string | null;
  taskId: string | null;
  taskTitle: string | null;
  createdAt: string;
}

export interface PointsFeed {
  items: PointsFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Hook to fetch points summary
 */
export function usePointsSummary() {
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/points/summary', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch summary: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch summary');
      }

      setSummary({
        total: data.total,
        byStage: data.byStage,
      });
    } catch (err: any) {
      console.error('[usePointsSummary] Error:', err);
      setError(err.message || 'Failed to fetch summary');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchSummary,
  };
}

/**
 * Hook to fetch points feed with pagination
 */
export function usePointsFeed(options?: { stageId?: string; limit?: number }) {
  const [feed, setFeed] = useState<PointsFeed>({
    items: [],
    nextCursor: null,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async (cursor?: string) => {
    try {
      const isLoadingMore = !!cursor;
      if (isLoadingMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (options?.stageId) params.set('stageId', options.stageId);
      if (options?.limit) params.set('limit', options.limit.toString());
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`/api/points/feed?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch feed');
      }

      setFeed(prev => ({
        items: cursor ? [...prev.items, ...data.items] : data.items,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
      }));
    } catch (err: any) {
      console.error('[usePointsFeed] Error:', err);
      setError(err.message || 'Failed to fetch feed');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [options?.stageId, options?.limit]);

  const loadMore = useCallback(() => {
    if (feed.nextCursor && !isLoadingMore) {
      fetchFeed(feed.nextCursor);
    }
  }, [feed.nextCursor, isLoadingMore, fetchFeed]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  return {
    feed,
    isLoading,
    isLoadingMore,
    error,
    loadMore,
    hasMore: feed.hasMore,
    refetch: () => fetchFeed(),
  };
}
