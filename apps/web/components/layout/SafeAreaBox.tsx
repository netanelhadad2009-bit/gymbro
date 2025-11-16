/**
 * SafeAreaBox - Universal safe-area container for iOS notch/home indicator
 *
 * Applies proper safe-area padding for iOS devices while maintaining
 * a minimum fallback for Android/web. Use this as the root container
 * for any full-screen page.
 *
 * Features:
 * - Respects env(safe-area-inset-*) for iOS notch and home indicator
 * - Falls back to custom CSS variables (--gb-safe-*)
 * - Supports RTL layout by default
 * - Uses dvh (dynamic viewport height) for proper iOS Safari handling
 *
 * Usage:
 * <SafeAreaBox>
 *   <YourPageContent />
 * </SafeAreaBox>
 */

import { ReactNode, CSSProperties } from 'react';

export interface SafeAreaBoxProps {
  children: ReactNode;
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Override default min-height behavior */
  minHeight?: 'full' | 'none' | string;
  /** Apply padding to top (notch area) */
  paddingTop?: boolean;
  /** Apply padding to bottom (home indicator area) */
  paddingBottom?: boolean;
  /** Minimum top padding fallback (in px) */
  minTopPadding?: number;
  /** Minimum bottom padding fallback (in px) */
  minBottomPadding?: number;
  /** HTML dir attribute for RTL */
  dir?: 'rtl' | 'ltr' | 'auto';
  /** Whether to allow vertical overflow (scroll) */
  allowScroll?: boolean;
}

export function SafeAreaBox({
  children,
  className = '',
  style,
  minHeight = 'full',
  paddingTop = true,
  paddingBottom = true,
  minTopPadding = 16,
  minBottomPadding = 0,
  dir = 'rtl',
  allowScroll = true,
}: SafeAreaBoxProps) {
  const computedMinHeight =
    minHeight === 'full'
      ? '100dvh'
      : minHeight === 'none'
      ? undefined
      : minHeight;

  const computedStyle: CSSProperties = {
    minHeight: computedMinHeight,
    paddingTop: paddingTop
      ? `max(env(safe-area-inset-top, 0px), var(--gb-safe-top, ${minTopPadding}px))`
      : undefined,
    paddingBottom: paddingBottom
      ? `max(env(safe-area-inset-bottom, 0px), ${minBottomPadding}px)`
      : undefined,
    overflowY: allowScroll ? 'auto' : undefined,
    overflowX: 'hidden',
    ...style,
  };

  return (
    <div className={className} style={computedStyle} dir={dir}>
      {children}
    </div>
  );
}

/**
 * SafeAreaSection - For nested sections within a SafeAreaBox
 * Use when you need safe-area awareness on a subsection without full-page height
 */
export function SafeAreaSection({
  children,
  className = '',
  style,
  paddingTop = false,
  paddingBottom = false,
  minTopPadding = 0,
  minBottomPadding = 0,
}: Omit<SafeAreaBoxProps, 'minHeight' | 'dir' | 'allowScroll'>) {
  return (
    <SafeAreaBox
      className={className}
      style={style}
      minHeight="none"
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      minTopPadding={minTopPadding}
      minBottomPadding={minBottomPadding}
      allowScroll={false}
    >
      {children}
    </SafeAreaBox>
  );
}
