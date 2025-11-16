/**
 * Platform Abstraction Layer - Main Export
 *
 * Barrel export for easy imports:
 *   import { usePlatform, type PlatformEnv } from '@/lib/platform';
 */

// Type exports
export type {
  PlatformStorage,
  PlatformNavigation,
  PlatformHaptics,
  PlatformInfo,
  PlatformNetwork,
  NetworkStatus,
  PlatformEnv,
} from './types';

// Context and hooks
export {
  PlatformProvider,
  usePlatform,
  usePlatformStorage,
  usePlatformNavigation,
  usePlatformHaptics,
  usePlatformInfo,
} from './context';

// Factory (for manual instantiation if needed)
export { createPlatformEnv, getPlatformType } from './factory';

// Adapters (exported for testing purposes)
export {
  WebStorageAdapter,
  WebNavigationAdapter,
  WebHapticsAdapter,
  WebPlatformInfo,
  WebNetworkAdapter,
} from './adapters/web';

export {
  NativeStorageAdapter,
  NativeNavigationAdapter,
  NativeHapticsAdapter,
  NativePlatformInfo,
  NativeNetworkAdapter,
} from './adapters/native';
