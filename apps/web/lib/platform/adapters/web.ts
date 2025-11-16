/**
 * Platform Abstraction Layer - Web Adapter
 *
 * Implements platform interfaces using browser APIs:
 * - Storage: localStorage (wrapped in async interface)
 * - Navigation: Next.js router + window.location fallback
 * - Haptics: Vibration API (where supported)
 * - Info: User agent detection
 */

import type {
  PlatformStorage,
  PlatformNavigation,
  PlatformHaptics,
  PlatformInfo,
  PlatformNetwork,
  NetworkStatus,
} from '../types';

/**
 * Web Storage Adapter
 * Wraps localStorage in async interface for compatibility with native adapters
 */
export class WebStorageAdapter implements PlatformStorage {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('[WebStorage] getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('[WebStorage] Quota exceeded');
        throw new Error('אחסון מלא - אנא נקה נתונים ישנים');
      }
      console.error('[WebStorage] setItem error:', error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('[WebStorage] removeItem error:', error);
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const allKeys = Object.keys(localStorage);
      if (prefix) {
        return allKeys.filter(key => key.startsWith(prefix));
      }
      return allKeys;
    } catch (error) {
      console.error('[WebStorage] keys error:', error);
      return [];
    }
  }

  async clear(prefix?: string): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (prefix) {
        const keysToRemove = await this.keys(prefix);
        for (const key of keysToRemove) {
          localStorage.removeItem(key);
        }
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.error('[WebStorage] clear error:', error);
    }
  }
}

/**
 * Web Navigation Adapter
 * Uses Next.js router with window.location fallback for reliability
 */
export class WebNavigationAdapter implements PlatformNavigation {
  constructor(private router?: any) {}

  async replace(url: string): Promise<void> {
    if (!this.router) {
      if (typeof window !== 'undefined') {
        window.location.replace(url);
      }
      return;
    }

    try {
      this.router.replace(url);
    } catch (error) {
      console.error('[WebNavigation] replace error:', error);
    }

    // Fallback: try again on next tick
    setTimeout(() => {
      try {
        this.router?.replace(url);
      } catch {}
    }, 0);

    // Final fallback: use window.location after 400ms if navigation didn't happen
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.location.pathname !== url) {
        window.location.replace(url);
      }
    }, 400);
  }

  async push(url: string): Promise<void> {
    if (!this.router) {
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
      return;
    }

    try {
      this.router.push(url);
    } catch (error) {
      console.error('[WebNavigation] push error:', error);
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    }
  }

  async back(): Promise<void> {
    if (!this.router) {
      if (typeof window !== 'undefined') {
        window.history.back();
      }
      return;
    }

    try {
      this.router.back();
    } catch (error) {
      console.error('[WebNavigation] back error:', error);
      if (typeof window !== 'undefined') {
        window.history.back();
      }
    }
  }

  getCurrentPath(): string {
    if (typeof window === 'undefined') {
      return '/';
    }
    return window.location.pathname;
  }

  async refresh(): Promise<void> {
    if (!this.router) {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }

    try {
      this.router.refresh();
    } catch (error) {
      console.error('[WebNavigation] refresh error:', error);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  }
}

/**
 * Web Haptics Adapter
 * Uses Vibration API where available (primarily mobile browsers)
 */
export class WebHapticsAdapter implements PlatformHaptics {
  private canVibrate(): boolean {
    return typeof window !== 'undefined' && 'vibrate' in navigator;
  }

  async light(duration: number = 10): Promise<void> {
    if (this.canVibrate()) {
      try {
        navigator.vibrate(duration);
      } catch (error) {
        console.error('[WebHaptics] light error:', error);
      }
    }
  }

  async medium(): Promise<void> {
    if (this.canVibrate()) {
      try {
        navigator.vibrate(20);
      } catch (error) {
        console.error('[WebHaptics] medium error:', error);
      }
    }
  }

  async heavy(): Promise<void> {
    if (this.canVibrate()) {
      try {
        navigator.vibrate(40);
      } catch (error) {
        console.error('[WebHaptics] heavy error:', error);
      }
    }
  }

  async success(): Promise<void> {
    if (this.canVibrate()) {
      try {
        navigator.vibrate([10, 50, 10]);
      } catch (error) {
        console.error('[WebHaptics] success error:', error);
      }
    }
  }

  async error(): Promise<void> {
    if (this.canVibrate()) {
      try {
        navigator.vibrate([30, 50, 30]);
      } catch (error) {
        console.error('[WebHaptics] error error:', error);
      }
    }
  }

  async selection(): Promise<void> {
    if (this.canVibrate()) {
      try {
        navigator.vibrate(5);
      } catch (error) {
        console.error('[WebHaptics] selection error:', error);
      }
    }
  }
}

/**
 * Web Platform Info Adapter
 * Provides platform detection and version info
 */
export class WebPlatformInfo implements PlatformInfo {
  isNative(): boolean {
    return false;
  }

  isWeb(): boolean {
    return true;
  }

  getPlatform(): 'web' | 'ios' | 'android' {
    return 'web';
  }

  getVersion(): { platform: string; osVersion?: string } {
    if (typeof window === 'undefined') {
      return { platform: 'web' };
    }

    const userAgent = navigator.userAgent;
    return {
      platform: 'web',
      osVersion: userAgent,
    };
  }
}

/**
 * Web Network Adapter
 * Uses navigator.onLine and online/offline events
 */
export class WebNetworkAdapter implements PlatformNetwork {
  async getStatus(): Promise<NetworkStatus> {
    if (typeof window === 'undefined') {
      return { connected: true, connectionType: 'unknown' };
    }

    const connected = navigator.onLine;

    // Try to get connection type from Network Information API (if available)
    let connectionType: NetworkStatus['connectionType'] = 'unknown';

    try {
      // @ts-ignore - Network Information API not in all browsers
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        if (effectiveType === 'wifi' || effectiveType === '4g') {
          connectionType = 'wifi'; // Treat fast connections as wifi-like
        } else if (effectiveType) {
          connectionType = 'cellular';
        }
      }
    } catch {
      // Network Information API not available, use 'unknown'
    }

    if (!connected) {
      connectionType = 'none';
    }

    return { connected, connectionType };
  }

  onStatusChange(callback: (status: NetworkStatus) => void): () => void {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const handleOnline = async () => {
      const status = await this.getStatus();
      console.log('[WebNetwork] Online event', status);
      callback(status);
    };

    const handleOffline = async () => {
      const status = await this.getStatus();
      console.log('[WebNetwork] Offline event', status);
      callback(status);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Return cleanup function
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }
}
