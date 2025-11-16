import { Capacitor } from '@capacitor/core';

/**
 * Check if running on a native platform (iOS/Android)
 * @returns true if native, false if web
 */
export const isNative = () => Capacitor.isNativePlatform();
