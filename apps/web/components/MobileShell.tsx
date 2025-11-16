"use client";
import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Props = {
  header?: React.ReactNode;     // e.g., page title bar
  footer?: React.ReactNode;     // e.g., primary CTA or BottomNav
  children: React.ReactNode;    // scrollable content
  className?: string;
  noHeaderShadow?: boolean;     // disable header backdrop blur/shadow
  title?: string;               // optional title for header
  background?: React.ReactNode; // full-screen background (e.g., hero image)
  overlayClass?: string;        // overlay class for background (e.g., "bg-black/45")
  disableScroll?: boolean;      // disable scrolling when content fits on screen
};

export default function MobileShell({ header, footer, children, className, noHeaderShadow, title, background, overlayClass, disableScroll }: Props) {
  const pathname = usePathname();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset scroll position when pathname changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [pathname]);
  return (
    <div className="screen min-h-[100dvh] min-h-[100svh] flex flex-col bg-[#0b0d0e] text-white relative overflow-hidden">
      {/* Full-screen background image */}
      {background && (
        <div className="absolute inset-0 -z-10">
          {background}
          {overlayClass && <div className={`absolute inset-0 ${overlayClass}`} />}
        </div>
      )}

      {/* Fixed header + safe area */}
      {(header || title) && (
        <div className={`pt-safe shrink-0 sticky top-0 z-40 ${noHeaderShadow ? 'bg-transparent' : 'bg-[#0b0d0e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0b0d0e]/75'}`}>
          {header || (title && (
            <div className="px-4 py-3">
              <h1 className="text-lg font-bold text-center">{title}</h1>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable content */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 ${
          disableScroll
            ? 'overflow-hidden'
            : 'overflow-y-auto overscroll-contain'
        } ${className ?? ""}`}
      >
        {children}
      </div>

      {/* Fixed footer + safe area */}
      {footer && (
        <div className={`pb-safe shrink-0 sticky bottom-0 z-50 px-4 py-4 pt-3 ${noHeaderShadow ? 'bg-[#0b0d0e]/80' : 'bg-[#0b0d0e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0b0d0e]/75'}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
