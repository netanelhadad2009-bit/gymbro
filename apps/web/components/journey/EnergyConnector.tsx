/**
 * EnergyConnector - Animated energy line between orbs
 *
 * Features:
 * - Glowing lime path when active
 * - Animated gradient flow
 * - Surge effect on completion
 * - Smooth curves between zigzag positions
 */

'use client';

import { motion } from 'framer-motion';

interface EnergyConnectorProps {
  fromY: number;
  toY: number;
  fromX: number;
  toX: number;
  active: boolean;
  index: number;
}

export function EnergyConnector({
  fromY,
  toY,
  fromX,
  toX,
  active,
  index,
}: EnergyConnectorProps) {
  // Create smooth bezier curve
  const midY = (fromY + toY) / 2;
  const controlOffset = Math.abs(toX - fromX) * 0.5; // Curve more when zigzag is wider

  const path = `M ${fromX} ${fromY} C ${fromX} ${midY - controlOffset}, ${toX} ${midY + controlOffset}, ${toX} ${toY}`;

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 2000"
      preserveAspectRatio="xMidYMid meet"
      style={{ zIndex: 1 }}
    >
      <defs>
        {/* Active energy gradient with animation */}
        <linearGradient id={`energyGradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(226,241,99,0.0)" />
          <stop offset="30%" stopColor="rgba(226,241,99,0.3)">
            <animate
              attributeName="offset"
              values="0%;30%;60%;90%;100%"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="50%" stopColor="rgba(226,241,99,0.8)">
            <animate
              attributeName="offset"
              values="30%;60%;90%;100%;100%"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="rgba(226,241,99,0.0)" />
        </linearGradient>

        {/* Blur filter for glow effect */}
        <filter id={`glow-${index}`}>
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Base path (always visible, very dim) */}
      <motion.path
        d={path}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        stroke="rgba(63, 63, 70, 0.3)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.8, delay: index * 0.15, ease: 'easeInOut' },
          opacity: { duration: 0.4, delay: index * 0.15 },
        }}
      />

      {/* Active glowing path */}
      {active && (
        <>
          {/* Main glow path */}
          <motion.path
            d={path}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            stroke={`url(#energyGradient-${index})`}
            filter={`url(#glow-${index})`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { duration: 0.8, delay: index * 0.15, ease: 'easeInOut' },
              opacity: { duration: 0.4, delay: index * 0.15 },
            }}
          />

          {/* Outer glow for extra brightness */}
          <motion.path
            d={path}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            stroke="rgba(226,241,99,0.15)"
            style={{ filter: 'blur(8px)' }}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0, 1, 0.6] }}
            transition={{
              pathLength: { duration: 0.8, delay: index * 0.15, ease: 'easeInOut' },
              opacity: { duration: 1.5, delay: index * 0.15 },
            }}
          />
        </>
      )}
    </svg>
  );
}
