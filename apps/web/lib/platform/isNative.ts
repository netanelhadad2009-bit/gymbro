import { Capacitor } from '@capacitor/core';

/**
 * Check if running on a native platform (iOS/Android)
 * Performs additional checks to ensure we're truly on native
 * @returns true if native, false if web
 */
export const isNative = () => {
  // Server-side rendering always returns false
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if running in a browser (window location has http/https protocol)
  if (window.location.protocol.startsWith('http')) {
    console.log('[Platform] Detected web environment (http/https protocol)');
    return false;
  }

  // Check Capacitor's native platform detection
  const isCapacitorNative = Capacitor.isNativePlatform();
  console.log('[Platform] Capacitor.isNativePlatform():', isCapacitorNative);

  return isCapacitorNative;
};
