/**
 * MapFrame - Presentational container for Journey Map
 *
 * Provides consistent visual frame (gradients, sizing, padding) across
 * Journey page and Preview/Summary pages. Pure presentation, no logic.
 *
 * Usage:
 * <MapFrame>{children}</MapFrame>
 * <MapFrame overlayChildren={<GlassCard />}>{children}</MapFrame>
 */

import { ReactNode } from 'react';

interface MapFrameProps {
  children: ReactNode;
  overlayChildren?: ReactNode;
  className?: string;
  /** If true, constrains height to fit viewport (for preview/summary). If false, uses natural height for scrolling pages. */
  constrainHeight?: boolean;
}

export function MapFrame({ children, overlayChildren, className = '', constrainHeight = true }: MapFrameProps) {
  // For scrolling pages (journey), use natural height without constraints
  const heightStyle = constrainHeight
    ? {
        height: 'min(92vw, 720px)',
        maxHeight: 'calc(100dvh - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px) - 120px)',
      }
    : {
        height: 'auto',
        minHeight: 'min(92vw, 720px)',
      };

  return (
    <div
      className={`relative mx-auto rounded-2xl overflow-hidden ${className}`}
      style={{
        // Square container that scales to viewport width
        width: 'min(92vw, 720px)',
        ...heightStyle,
        position: 'relative',
        overflow: 'hidden',
        isolation: 'isolate',
        contain: 'layout paint',
      }}
    >
      {/* Map content */}
      <div className={constrainHeight ? "absolute inset-0 w-full h-full" : "relative w-full"}>
        {children}
      </div>

      {/* Optional overlay content (e.g., glass card) */}
      {overlayChildren && (
        <div className="absolute inset-0 pointer-events-none">
          {overlayChildren}
        </div>
      )}
    </div>
  );
}
