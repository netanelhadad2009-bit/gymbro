'use client';
import React, { PropsWithChildren, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type Props = PropsWithChildren<{
  header: React.ReactNode;   // progress bar, title, subtitle
  footer: React.ReactNode;   // Next button bar
  className?: string;
}>;

/**
 * Mobile onboarding screen with pinned header/footer and a scrollable content slot.
 * Header and footer are *not* part of the scroll container - they are completely fixed.
 *
 * This ensures:
 * - Header stays absolutely fixed at top (never moves)
 * - Footer stays absolutely fixed at bottom (never moves)
 * - Only the middle content scrolls
 * - Full-screen layout with safe areas
 */
export default function OnboardingScreen({ header, footer, children, className }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Reset scroll position when pathname changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [pathname]);

  return (
    <div
      className={`flex flex-col min-h-[100dvh] min-h-[100svh] bg-[#0b0d0e] text-white ${className || ''}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      dir="rtl"
    >
      {/* Header - not scrollable */}
      <div className="shrink-0 bg-[#0b0d0e]">
        {header}
      </div>

      {/* Scrollable content only - this is the ONLY thing that scrolls */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {children}
      </div>

      {/* Footer - not scrollable */}
      <div className="shrink-0 bg-[#0b0d0e] border-t border-white/10">
        {footer}
      </div>
    </div>
  );
}
