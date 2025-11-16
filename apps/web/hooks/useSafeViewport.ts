/**
 * useSafeViewport - Hook for accessing safe viewport dimensions
 *
 * Provides real-time viewport dimensions that account for iOS dynamic UI
 * (address bar, home indicator, notch). Updates on resize and orientation change.
 *
 * Usage:
 * ```tsx
 * const { dvh, svh, safeTop, safeBottom, isIOS } = useSafeViewport();
 * // dvh = dynamic viewport height (adjusts with address bar)
 * // svh = small viewport height (fixed, smallest size)
 * // safeTop = top safe area inset (notch)
 * // safeBottom = bottom safe area inset (home indicator)
 * ```
 */

import { useState, useEffect } from 'react';

export interface SafeViewportDimensions {
  /** Dynamic viewport height in px (adjusts with iOS address bar) */
  dvh: number;
  /** Small viewport height in px (fixed, smallest size) */
  svh: number;
  /** Viewport width in px */
  vw: number;
  /** Top safe area inset in px (notch) */
  safeTop: number;
  /** Bottom safe area inset in px (home indicator) */
  safeBottom: number;
  /** Left safe area inset in px (landscape orientation) */
  safeLeft: number;
  /** Right safe area inset in px (landscape orientation) */
  safeRight: number;
  /** Whether running on iOS device */
  isIOS: boolean;
  /** Whether running in standalone PWA mode */
  isStandalone: boolean;
}

/**
 * Parse CSS env() value from computed styles
 */
function getSafeAreaInset(side: 'top' | 'bottom' | 'left' | 'right'): number {
  if (typeof window === 'undefined') return 0;

  // Try to get from CSS custom property first
  const root = document.documentElement;
  const value = getComputedStyle(root).getPropertyValue(
    `--safe-area-inset-${side}`
  );

  if (value) {
    return parseInt(value, 10) || 0;
  }

  // Fallback: Create a temporary element to measure env()
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    padding-${side}: env(safe-area-inset-${side}, 0px);
  `;
  document.body.appendChild(div);
  const computed = window.getComputedStyle(div);
  const inset = parseInt(computed.getPropertyValue(`padding-${side}`), 10) || 0;
  document.body.removeChild(div);

  return inset;
}

/**
 * Detect if running on iOS
 */
function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detect if running in standalone PWA mode
 */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * Get dynamic viewport height (accounts for iOS address bar)
 */
function getDynamicViewportHeight(): number {
  if (typeof window === 'undefined') return 0;

  // Modern browsers support dvh
  if (CSS.supports('height', '100dvh')) {
    // Create temporary element to measure dvh
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100dvh;';
    document.body.appendChild(div);
    const height = div.clientHeight;
    document.body.removeChild(div);
    return height;
  }

  // Fallback: use window.innerHeight (not perfect but works)
  return window.innerHeight;
}

/**
 * Get small viewport height (fixed, doesn't change with address bar)
 */
function getSmallViewportHeight(): number {
  if (typeof window === 'undefined') return 0;

  // Modern browsers support svh
  if (CSS.supports('height', '100svh')) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100svh;';
    document.body.appendChild(div);
    const height = div.clientHeight;
    document.body.removeChild(div);
    return height;
  }

  // Fallback: use screen.height (not perfect but reasonable estimate)
  return window.screen.height;
}

export function useSafeViewport(): SafeViewportDimensions {
  const [dimensions, setDimensions] = useState<SafeViewportDimensions>(() => ({
    dvh: typeof window !== 'undefined' ? window.innerHeight : 0,
    svh: typeof window !== 'undefined' ? window.innerHeight : 0,
    vw: typeof window !== 'undefined' ? window.innerWidth : 0,
    safeTop: 0,
    safeBottom: 0,
    safeLeft: 0,
    safeRight: 0,
    isIOS: false,
    isStandalone: false,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDimensions = () => {
      setDimensions({
        dvh: getDynamicViewportHeight(),
        svh: getSmallViewportHeight(),
        vw: window.innerWidth,
        safeTop: getSafeAreaInset('top'),
        safeBottom: getSafeAreaInset('bottom'),
        safeLeft: getSafeAreaInset('left'),
        safeRight: getSafeAreaInset('right'),
        isIOS: detectIOS(),
        isStandalone: detectStandalone(),
      });
    };

    // Initial measurement
    updateDimensions();

    // Update on resize and orientation change
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    // iOS-specific: Update when visualViewport changes (keyboard, address bar)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateDimensions);
      window.visualViewport.addEventListener('scroll', updateDimensions);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateDimensions);
        window.visualViewport.removeEventListener('scroll', updateDimensions);
      }
    };
  }, []);

  return dimensions;
}

/**
 * Hook to get just the dvh value (most common use case)
 */
export function useDynamicViewportHeight(): number {
  const { dvh } = useSafeViewport();
  return dvh;
}

/**
 * Hook to check if device is iOS
 */
export function useIsIOS(): boolean {
  const { isIOS } = useSafeViewport();
  return isIOS;
}
