/**
 * Platform Abstraction Layer - Core Type Definitions
 *
 * This module defines the interfaces for abstracting browser-specific and native APIs
 * to enable the app to run on both Web and Native (Capacitor) platforms.
 */

/**
 * Platform-agnostic storage interface
 * All operations are async to support both localStorage (sync) and Capacitor Preferences (async)
 */
export interface PlatformStorage {
  /**
   * Get an item from storage
   * @param key Storage key
   * @returns Promise resolving to the value or null if not found
   */
  getItem(key: string): Promise<string | null>;

  /**
   * Set an item in storage
   * @param key Storage key
   * @param value Value to store
   * @throws Error if storage quota exceeded or other error
   */
  setItem(key: string, value: string): Promise<void>;

  /**
   * Remove an item from storage
   * @param key Storage key
   */
  removeItem(key: string): Promise<void>;

  /**
   * Get all keys, optionally filtered by prefix
   * @param prefix Optional prefix to filter keys
   * @returns Promise resolving to array of keys
   */
  keys(prefix?: string): Promise<string[]>;

  /**
   * Clear all items, optionally filtered by prefix
   * @param prefix Optional prefix to filter items to clear
   */
  clear(prefix?: string): Promise<void>;
}

/**
 * Platform-agnostic navigation interface
 */
export interface PlatformNavigation {
  /**
   * Replace current route (no history entry)
   * @param url URL to navigate to
   */
  replace(url: string): Promise<void>;

  /**
   * Push a new route (adds history entry)
   * @param url URL to navigate to
   */
  push(url: string): Promise<void>;

  /**
   * Go back in history
   */
  back(): Promise<void>;

  /**
   * Get current pathname
   * @returns Current path (e.g., "/onboarding/generating")
   */
  getCurrentPath(): string;

  /**
   * Refresh current page
   */
  refresh(): Promise<void>;
}

/**
 * Platform-agnostic haptics interface
 */
export interface PlatformHaptics {
  /**
   * Light impact haptic feedback
   * @param duration Optional duration in ms (Web only)
   */
  light(duration?: number): Promise<void>;

  /**
   * Medium impact haptic feedback
   */
  medium(): Promise<void>;

  /**
   * Heavy impact haptic feedback
   */
  heavy(): Promise<void>;

  /**
   * Success notification haptic
   */
  success(): Promise<void>;

  /**
   * Error notification haptic
   */
  error(): Promise<void>;

  /**
   * Selection haptic feedback
   */
  selection(): Promise<void>;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  /**
   * Whether device is connected to network
   */
  connected: boolean;

  /**
   * Connection type (if available)
   */
  connectionType?: 'wifi' | 'cellular' | 'none' | 'unknown';
}

/**
 * Platform-agnostic network interface
 */
export interface PlatformNetwork {
  /**
   * Get current network status
   * @returns Promise resolving to network status
   */
  getStatus(): Promise<NetworkStatus>;

  /**
   * Subscribe to network status changes
   * @param callback Function called when network status changes
   * @returns Cleanup function to unsubscribe
   */
  onStatusChange(callback: (status: NetworkStatus) => void): () => void;
}

/**
 * Platform information interface
 */
export interface PlatformInfo {
  /**
   * Check if running in native container
   */
  isNative(): boolean;

  /**
   * Check if running in web browser
   */
  isWeb(): boolean;

  /**
   * Get current platform
   */
  getPlatform(): 'web' | 'ios' | 'android';

  /**
   * Get platform version info
   */
  getVersion(): {
    platform: string;
    osVersion?: string;
  };
}

/**
 * Complete platform environment
 * Combines all platform-specific interfaces
 */
export interface PlatformEnv {
  storage: PlatformStorage;
  navigation: PlatformNavigation;
  haptics: PlatformHaptics;
  info: PlatformInfo;
  network: PlatformNetwork;
}
