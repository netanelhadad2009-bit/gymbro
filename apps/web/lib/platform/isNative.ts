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

  // Use Capacitor's built-in native platform detection
  // This correctly identifies native apps even when loading from remote URLs (e.g., Vercel)
  const isCapacitorNative = Capacitor.isNativePlatform();
  console.log('[Platform] Capacitor.isNativePlatform():', isCapacitorNative);

  return isCapacitorNative;
};
