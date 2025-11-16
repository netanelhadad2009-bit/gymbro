/**
 * ProgressRing - Circular progress indicator
 *
 * Displays a circular progress ring with optional glow effect
 */

'use client';

interface ProgressRingProps {
  /** Progress value from 0 to 1 */
  value: number;
  /** Ring size in pixels */
  size?: number;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Ring color (defaults to lime for active) */
  color?: string;
  /** Whether to show active glow effect */
  showGlow?: boolean;
  /** Custom class name */
  className?: string;
}

export function ProgressRing({
  value,
  size = 36,
  strokeWidth = 3,
  color = '#E2F163',
  showGlow = false,
  className = '',
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value * circumference);

  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity={0.2}
      />

      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.5s ease',
          filter: showGlow ? `drop-shadow(0 0 6px ${color}80)` : 'none',
        }}
      />
    </svg>
  );
}
