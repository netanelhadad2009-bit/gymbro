"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";

interface OnboardingLayoutProps {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  disableContentScroll?: boolean;
  className?: string;
  contentClassName?: string;
}

/**
 * OnboardingLayout - Full-height layout with fixed header/footer and scrollable middle
 * Uses dynamic viewport units (dvh/svh) to fill the entire screen on mobile
 * Supports iOS safe areas (notch) and prevents body scroll
 * Blocks rubber-band scrolling on iOS by preventing touch events on header/footer
 */
export default function OnboardingLayout({
  header,
  footer,
  children,
  disableContentScroll = false,
  className = "",
  contentClassName = "",
}: OnboardingLayoutProps) {
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  // Lock document scroll to prevent iOS rubber-band
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    // Save previous values
    const prevHtml = {
      overflow: html.style.overflow,
      overscrollBehavior: html.style.overscrollBehavior,
    };
    const prevBody = {
      overflow: body.style.overflow,
      overscrollBehavior: body.style.overscrollBehavior,
    };

    // Lock scroll
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    return () => {
      // Restore on unmount
      html.style.overflow = prevHtml.overflow;
      html.style.overscrollBehavior = prevHtml.overscrollBehavior;
      body.style.overflow = prevBody.overflow;
      body.style.overscrollBehavior = prevBody.overscrollBehavior;
    };
  }, []);

  // Reset scroll position when pathname changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [pathname]);

  // Block all scroll/touch events on header and footer
  const blockScrollEvents = useCallback((e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  useEffect(() => {
    const headerEl = headerRef.current;
    const footerEl = footerRef.current;

    if (headerEl) {
      headerEl.addEventListener('touchmove', blockScrollEvents, { passive: false });
      headerEl.addEventListener('wheel', blockScrollEvents, { passive: false });
    }

    if (footerEl) {
      footerEl.addEventListener('touchmove', blockScrollEvents, { passive: false });
      footerEl.addEventListener('wheel', blockScrollEvents, { passive: false });
    }

    return () => {
      if (headerEl) {
        headerEl.removeEventListener('touchmove', blockScrollEvents);
        headerEl.removeEventListener('wheel', blockScrollEvents);
      }
      if (footerEl) {
        footerEl.removeEventListener('touchmove', blockScrollEvents);
        footerEl.removeEventListener('wheel', blockScrollEvents);
      }
    };
  }, [blockScrollEvents]);

  return (
    <>
      {/* Background overlay - prevents white flash during rubber-band */}
      <div className="fixed top-0 left-0 right-0 bottom-0 bg-[#0b0d0e] -z-10" />

      <div
        id="onboarding-screen-root"
        className={`flex flex-col h-[100dvh] w-full bg-[#0b0d0e] text-white overflow-hidden ${className}`}
        style={{
          height: '100dvh',
          width: '100%',
          margin: 0,
          padding: 0,
          overscrollBehavior: 'none',
        }}
      >
        {/* Fixed header - extends into top safe area */}
        {header && (
          <header
            ref={headerRef}
            className="shrink-0 z-30 bg-[#0b0d0e] touch-none select-none pt-[env(safe-area-inset-top)]"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onWheel={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {header}
          </header>
        )}

        {/* Scrollable middle content - only area that scrolls */}
        <main
          ref={contentRef}
          id="onboarding-scroll-area"
          className={`flex-1 ${disableContentScroll ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'} ${contentClassName}`}
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          {children}
        </main>

        {/* Fixed footer - extends into bottom safe area */}
        {footer && (
          <footer
            ref={footerRef}
            className="shrink-0 z-30 bg-[#0b0d0e] touch-none select-none pb-[env(safe-area-inset-bottom)] pt-3"
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onWheel={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {footer}
          </footer>
        )}
      </div>
    </>
  );
}