/**
 * Simple in-memory cache for journey progress data
 * Reduces redundant Supabase queries
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ProgressCache {
  private cache: Map<string, CacheEntry<any>>;
  private readonly TTL_MS: number;

  constructor(ttlMinutes: number = 5) {
    this.cache = new Map();
    this.TTL_MS = ttlMinutes * 60 * 1000;
  }

  /**
   * Get cached data if valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > this.TTL_MS) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[ProgressCache] HIT: ${key} (age: ${Math.round(age / 1000)}s)`);
    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    console.log(`[ProgressCache] SET: ${key}`);
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`[ProgressCache] INVALIDATE: ${key}`);
  }

  /**
   * Invalidate all cache entries matching prefix
   */
  invalidatePattern(prefix: string): void {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    console.log(`[ProgressCache] INVALIDATE_PATTERN: ${prefix} (${count} entries)`);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[ProgressCache] CLEAR: ${size} entries removed`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; ttlMs: number } {
    return {
      size: this.cache.size,
      ttlMs: this.TTL_MS,
    };
  }
}

// Singleton instance with 5-minute TTL
export const progressCache = new ProgressCache(5);

/**
 * Cache key generators
 */
export const cacheKeys = {
  journey: (userId: string) => `journey:${userId}`,
  nodeProgress: (userId: string, nodeId: string) => `progress:${userId}:${nodeId}`,
  chapterStatus: (userId: string) => `chapters:${userId}`,
  userPoints: (userId: string) => `points:${userId}`,
  userBadges: (userId: string) => `badges:${userId}`,
};
