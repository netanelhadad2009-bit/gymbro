/**
 * Platform Abstraction Layer - React Context
 *
 * Provides platform environment to all components via React Context
 * Usage:
 *   const platform = usePlatform();
 *   await platform.storage.setItem('key', 'value');
 *   await platform.navigation.replace('/path');
 */

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { PlatformEnv } from './types';
import { createPlatformEnv } from './factory';

/**
 * Platform Context
 */
const PlatformContext = createContext<PlatformEnv | null>(null);

/**
 * Platform Provider Props
 */
interface PlatformProviderProps {
  children: ReactNode;
}

/**
 * Platform Provider Component
 * Wrap your app with this to provide platform environment to all children
 *
 * Example:
 *   <PlatformProvider>
 *     <App />
 *   </PlatformProvider>
 */
export function PlatformProvider({ children }: PlatformProviderProps) {
  const router = useRouter();

  // Create platform environment once and memoize it
  // Router reference is stable in Next.js, so this won't recreate unnecessarily
  const platformEnv = useMemo(() => {
    return createPlatformEnv(router);
  }, [router]);

  return (
    <PlatformContext.Provider value={platformEnv}>
      {children}
    </PlatformContext.Provider>
  );
}

/**
 * Hook to access platform environment
 * Must be used within PlatformProvider
 *
 * @returns PlatformEnv with storage, navigation, haptics, and info
 * @throws Error if used outside PlatformProvider
 *
 * Example:
 *   const platform = usePlatform();
 *   const draft = await platform.storage.getItem('program_draft');
 *   await platform.navigation.replace('/onboarding/preview');
 *   await platform.haptics.success();
 */
export function usePlatform(): PlatformEnv {
  const context = useContext(PlatformContext);

  if (!context) {
    throw new Error(
      'usePlatform must be used within PlatformProvider. ' +
      'Wrap your app with <PlatformProvider> in the root layout.'
    );
  }

  return context;
}

/**
 * Hook to access platform storage directly
 * Convenience wrapper around usePlatform().storage
 */
export function usePlatformStorage() {
  const platform = usePlatform();
  return platform.storage;
}

/**
 * Hook to access platform navigation directly
 * Convenience wrapper around usePlatform().navigation
 */
export function usePlatformNavigation() {
  const platform = usePlatform();
  return platform.navigation;
}

/**
 * Hook to access platform haptics directly
 * Convenience wrapper around usePlatform().haptics
 */
export function usePlatformHaptics() {
  const platform = usePlatform();
  return platform.haptics;
}

/**
 * Hook to access platform info directly
 * Convenience wrapper around usePlatform().info
 */
export function usePlatformInfo() {
  const platform = usePlatform();
  return platform.info;
}
