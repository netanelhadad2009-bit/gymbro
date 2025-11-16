/**
 * MapBackground - Pure presentational background layer for Journey Map
 *
 * iOS-safe background with concentric glows, vignette, and subtle noise.
 * Uses filter: blur() on internal SVG layer only (not backdrop-filter).
 *
 * Performance optimizations:
 * - contain: layout paint
 * - transform: translateZ(0) for GPU acceleration
 * - will-change: filter on blurred layer
 * - No large backdrop-filter layers
 */

// Simple className merger
function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export type MapBackgroundProps = {
  className?: string;
  style?: React.CSSProperties;
  glowColor?: string;        // default '#E2F163'
  vignetteOpacity?: number;  // default 0.35
  noiseOpacity?: number;     // default 0.06
  blurPx?: number;           // default 6
};

// Tiny noise texture as data URI (4x4 transparent noise)
const NOISE_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAG0lEQVQYV2NkYGD4z8DAwMgABXAGjgUMDAwMAA' +
  'cGAQFfL3KQAAAAASUVORK5CYII=';

export function MapBackground({
  className = '',
  style,
  glowColor = '#E2F163',
  vignetteOpacity = 0.35,
  noiseOpacity = 0.06,
  blurPx = 6,
}: MapBackgroundProps) {
  return (
    <div
      className={cn(
        'relative isolate w-full h-full rounded-2xl overflow-hidden',
        'bg-[#0b0d0e]',
        className
      )}
      style={{
        contain: 'layout paint',
        ...style,
      }}
    >
      {/* Soft vignette via radial-gradient (no backdrop-filter needed) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(120% 120% at 50% 40%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
        }}
      />

      {/* Concentric accent glows (SVG for crispness) with blur */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          filter: `blur(${blurPx}px)`,
          transform: 'translateZ(0)',
          willChange: 'filter',
        }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Primary central glow */}
          <radialGradient id="mapGlow1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.50" />
            <stop offset="60%" stopColor={glowColor} stopOpacity="0.12" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
          {/* Secondary offset glow for depth */}
          <radialGradient id="mapGlow2" cx="50%" cy="60%" r="70%">
            <stop offset="0%" stopColor={glowColor} stopOpacity="0.20" />
            <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="38" fill="url(#mapGlow1)" />
        <circle cx="50" cy="65" r="55" fill="url(#mapGlow2)" />
      </svg>

      {/* Subtle noise texture for depth (tiled) */}
      <div
        className="absolute inset-0 mix-blend-soft-light pointer-events-none"
        style={{
          opacity: noiseOpacity,
          backgroundImage: `url("${NOISE_DATA_URI}")`,
          backgroundSize: '200px 200px',
        }}
      />
    </div>
  );
}
