/**
 * Platform Abstraction Layer - Factory
 *
 * Runtime platform detection and adapter selection
 * Detects whether app is running in Web or Native (Capacitor) environment
 * and returns the appropriate platform adapters
 */

import type { PlatformEnv } from './types';
import {
  WebStorageAdapter,
  WebNavigationAdapter,
  WebHapticsAdapter,
  WebPlatformInfo,
  WebNetworkAdapter,
} from './adapters/web';
import {
  NativeStorageAdapter,
  NativeNavigationAdapter,
  NativeHapticsAdapter,
  NativePlatformInfo,
  NativeNetworkAdapter,
} from './adapters/native';

/**
 * Detect if running in Capacitor native environment
 */
function isNativePlatform(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    // Check for Capacitor global
    const cap = (window as any).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function') {
      return cap.isNativePlatform();
    }

    // Fallback: check for Capacitor object existence
    return cap !== undefined;
  } catch {
    return false;
  }
}

/**
 * Create platform environment based on runtime detection
 *
 * @param router Optional Next.js router instance for navigation
 * @returns Complete PlatformEnv with appropriate adapters
 */
export function createPlatformEnv(router?: any): PlatformEnv {
  const isNative = isNativePlatform();

  if (isNative) {
    console.log('[Platform] Initializing NATIVE environment (Capacitor)');
    return {
      storage: new NativeStorageAdapter(),
      navigation: new NativeNavigationAdapter(router),
      haptics: new NativeHapticsAdapter(),
      info: new NativePlatformInfo(),
      network: new NativeNetworkAdapter(),
    };
  }

  console.log('[Platform] Initializing WEB environment');
  return {
    storage: new WebStorageAdapter(),
    navigation: new WebNavigationAdapter(router),
    haptics: new WebHapticsAdapter(),
    info: new WebPlatformInfo(),
    network: new WebNetworkAdapter(),
  };
}

/**
 * Get platform type string for logging/debugging
 */
export function getPlatformType(): 'web' | 'native' {
  return isNativePlatform() ? 'native' : 'web';
}
