/**
 * Chaos Engineering Helpers (Dev Only)
 *
 * Enables controlled failure injection for testing error handling.
 * Only active when NEXT_PUBLIC_CHAOS=1 environment variable is set.
 *
 * Usage:
 * - Set window.__GB_CHAOS__ = true in tests
 * - Use query params like ?chaos=stall or ?chaos=malformed
 * - Use chaosMode helpers to inject failures
 */

export const isChaosEnabled = () =>
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_CHAOS === '1'
    : (typeof window !== 'undefined' && (window as any).__GB_CHAOS__ === true);

export const chaosMode = {
  /**
   * Check if chaos mode is enabled
   */
  enabled: () => (
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_CHAOS === '1'
      : (window as any).__GB_CHAOS__ === true
  ),

  /**
   * Simulate a long stall (e.g., to trigger AbortController timeout)
   * Default: 70 seconds to exceed typical 30-60s timeouts
   */
  async stall(ms = 70_000) {
    if (!this.enabled()) return;
    console.log(`[Chaos] Stalling for ${ms}ms...`);
    await new Promise(res => setTimeout(res, ms));
  },

  /**
   * Force malformed JSON structure for API responses
   * @param data - Original data to return
   * @param flag - Chaos flag from query param (e.g., 'malformed')
   * @returns Corrupted data if chaos enabled and flag matches, otherwise original
   */
  maybeCorruptPayload<T>(data: T, flag?: string): any {
    if (!this.enabled()) return data;
    if (flag === 'malformed') {
      console.log('[Chaos] Corrupting payload with malformed data');
      return { bad: true, injectedBy: 'chaos' };
    }
    return data;
  },

  /**
   * Corrupt localStorage for a given key
   * @param key - localStorage key to corrupt
   */
  corruptLocalStorage(key: string) {
    if (!this.enabled()) return;
    console.log(`[Chaos] Corrupting localStorage key: ${key}`);
    try {
      localStorage.setItem(key, '{invalid json}}');
    } catch (e) {
      console.error('[Chaos] Failed to corrupt localStorage:', e);
    }
  },

  /**
   * Check if a specific chaos flag is active via URL query params
   * @param flagName - Name of the chaos flag to check (e.g., 'stall', 'malformed')
   * @returns true if the flag is present in the URL
   */
  hasFlag(flagName: string): boolean {
    if (!this.enabled()) return false;
    if (typeof window === 'undefined') return false;

    const params = new URLSearchParams(window.location.search);
    return params.get('chaos') === flagName;
  },

  /**
   * Get chaos flag value from URL query params
   * @param paramName - Query parameter name (default: 'chaos')
   * @returns chaos flag value or null
   */
  getFlag(paramName = 'chaos'): string | null {
    if (!this.enabled()) return null;
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    return params.get(paramName);
  },
};

/**
 * Type declaration for window.__GB_CHAOS__ flag
 */
declare global {
  interface Window {
    __GB_CHAOS__?: boolean;
    __gbErrorEvents?: Array<{ type: string; ts: number; [key: string]: any }>;
  }
}
