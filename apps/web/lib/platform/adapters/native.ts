/**
 * Platform Abstraction Layer - Native Adapter
 *
 * Implements platform interfaces using Capacitor APIs:
 * - Storage: @capacitor/preferences (async key-value storage)
 * - Navigation: React Navigation / Next.js router (hybrid)
 * - Haptics: @capacitor/haptics
 * - Info: @capacitor/device
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
 * Native Storage Adapter
 * Uses Capacitor Preferences for persistent key-value storage
 * All operations are natively async (no quota limits like localStorage)
 */
export class NativeStorageAdapter implements PlatformStorage {
  async getItem(key: string): Promise<string | null> {
    try {
      // Dynamically import to avoid errors when running on web
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error('[NativeStorage] getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
    } catch (error) {
      console.error('[NativeStorage] setItem error:', error);
      throw new Error('שמירת נתונים נכשלה');
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.remove({ key });
    } catch (error) {
      console.error('[NativeStorage] removeItem error:', error);
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { keys } = await Preferences.keys();

      if (prefix) {
        return keys.filter(key => key.startsWith(prefix));
      }
      return keys;
    } catch (error) {
      console.error('[NativeStorage] keys error:', error);
      return [];
    }
  }

  async clear(prefix?: string): Promise<void> {
    try {
      const { Preferences } = await import('@capacitor/preferences');

      if (prefix) {
        const keysToRemove = await this.keys(prefix);
        for (const key of keysToRemove) {
          await Preferences.remove({ key });
        }
      } else {
        await Preferences.clear();
      }
    } catch (error) {
      console.error('[NativeStorage] clear error:', error);
    }
  }
}

/**
 * Native Navigation Adapter
 * Uses Next.js router (which works in Capacitor WebView)
 * with native-specific fallbacks
 */
export class NativeNavigationAdapter implements PlatformNavigation {
  constructor(private router?: any) {}

  async replace(url: string): Promise<void> {
    if (!this.router) {
      console.warn('[NativeNavigation] No router available');
      return;
    }

    try {
      this.router.replace(url);
    } catch (error) {
      console.error('[NativeNavigation] replace error:', error);
    }

    // Fallback: try again on next tick
    setTimeout(() => {
      try {
        this.router?.replace(url);
      } catch {}
    }, 0);
  }

  async push(url: string): Promise<void> {
    if (!this.router) {
      console.warn('[NativeNavigation] No router available');
      return;
    }

    try {
      this.router.push(url);
    } catch (error) {
      console.error('[NativeNavigation] push error:', error);
    }
  }

  async back(): Promise<void> {
    if (!this.router) {
      console.warn('[NativeNavigation] No router available');
      return;
    }

    try {
      this.router.back();
    } catch (error) {
      console.error('[NativeNavigation] back error:', error);
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
      console.warn('[NativeNavigation] No router available');
      return;
    }

    try {
      this.router.refresh();
    } catch (error) {
      console.error('[NativeNavigation] refresh error:', error);
    }
  }
}

/**
 * Native Haptics Adapter
 * Uses Capacitor Haptics for native haptic feedback
 */
export class NativeHapticsAdapter implements PlatformHaptics {
  async light(_duration?: number): Promise<void> {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.error('[NativeHaptics] light error:', error);
    }
  }

  async medium(): Promise<void> {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.error('[NativeHaptics] medium error:', error);
    }
  }

  async heavy(): Promise<void> {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.error('[NativeHaptics] heavy error:', error);
    }
  }

  async success(): Promise<void> {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.error('[NativeHaptics] success error:', error);
    }
  }

  async error(): Promise<void> {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.error('[NativeHaptics] error error:', error);
    }
  }

  async selection(): Promise<void> {
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } catch (error) {
      console.error('[NativeHaptics] selection error:', error);
    }
  }
}

/**
 * Native Platform Info Adapter
 * Uses Capacitor Device and Platform APIs
 */
export class NativePlatformInfo implements PlatformInfo {
  isNative(): boolean {
    return true;
  }

  isWeb(): boolean {
    return false;
  }

  getPlatform(): 'web' | 'ios' | 'android' {
    // Dynamically detect platform
    // Note: This will be called synchronously, so we cache the result
    if (typeof window === 'undefined') {
      return 'web';
    }

    // Check Capacitor platform
    try {
      // Try to access Capacitor global
      const cap = (window as any).Capacitor;
      if (cap) {
        const platform = cap.getPlatform();
        if (platform === 'ios') return 'ios';
        if (platform === 'android') return 'android';
      }
    } catch {}

    // Fallback to user agent detection
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('iphone') || ua.includes('ipad')) {
      return 'ios';
    }
    if (ua.includes('android')) {
      return 'android';
    }

    return 'web';
  }

  getVersion(): { platform: string; osVersion?: string } {
    const platform = this.getPlatform();

    // Try to get device info asynchronously (but return synchronously with cached data)
    // In practice, you'd cache this on app startup
    return {
      platform,
      osVersion: undefined, // Would be populated from @capacitor/device
    };
  }
}

/**
 * Native Network Adapter
 * Uses Capacitor Network API for network status
 */
export class NativeNetworkAdapter implements PlatformNetwork {
  async getStatus(): Promise<NetworkStatus> {
    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();

      return {
        connected: status.connected,
        connectionType: status.connectionType as NetworkStatus['connectionType'],
      };
    } catch (error) {
      console.error('[NativeNetwork] Failed to get status:', error);
      // Fallback to assuming connected
      return { connected: true, connectionType: 'unknown' };
    }
  }

  onStatusChange(callback: (status: NetworkStatus) => void): () => void {
    let cleanup: (() => void) | null = null;

    // Setup listener asynchronously
    (async () => {
      try {
        const { Network } = await import('@capacitor/network');

        const listener = await Network.addListener('networkStatusChange', (status) => {
          console.log('[NativeNetwork] Status changed', status);
          callback({
            connected: status.connected,
            connectionType: status.connectionType as NetworkStatus['connectionType'],
          });
        });

        cleanup = () => {
          listener.remove();
        };
      } catch (error) {
        console.error('[NativeNetwork] Failed to add listener:', error);
      }
    })();

    // Return cleanup function
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }
}
