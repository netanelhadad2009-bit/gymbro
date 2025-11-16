/**
 * OrbPath - Animated energy connectors between orb nodes
 *
 * Features:
 * - SVG paths with gradient strokes
 * - Shimmer animation on active paths
 * - Surge effect when previous orb completes
 */

'use client';

import { motion } from 'framer-motion';
import { OrbTask } from '@/lib/journey/stages/useOrbs';

interface OrbPathProps {
  orbs: OrbTask[];
  accentColor: string;
}

interface ConnectorProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  isActive: boolean;
  accentColor: string;
  index: number;
}

function Connector({ from, to, isActive, accentColor, index }: ConnectorProps) {
  // Create a smooth bezier curve
  const midY = (from.y + to.y) / 2;
  const pathD = `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`;

  return (
    <g>
      {/* Base path */}
      <motion.path
        d={pathD}
        stroke={isActive ? `${accentColor}40` : '#3f3f46'}
        strokeWidth={isActive ? 3 : 2}
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          pathLength: { duration: 0.8, delay: index * 0.1, ease: 'easeInOut' },
          opacity: { duration: 0.4, delay: index * 0.1 },
        }}
      />

      {/* Animated shimmer for active paths */}
      {isActive && (
        <>
          <defs>
            <linearGradient id={`shimmer-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0" />
              <stop offset="50%" stopColor={accentColor} stopOpacity="0.8" />
              <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
              <animate
                attributeName="y1"
                values="0%;100%"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="y2"
                values="100%;200%"
                dur="2s"
                repeatCount="indefinite"
              />
            </linearGradient>
          </defs>

          <motion.path
            d={pathD}
            stroke={`url(#shimmer-${index})`}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 0.8,
              delay: index * 0.1,
              ease: 'easeInOut',
            }}
          />

          {/* Glow effect */}
          <motion.path
            d={pathD}
            stroke={accentColor}
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
            opacity={0.2}
            filter="blur(8px)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 0.8,
              delay: index * 0.1,
              ease: 'easeInOut',
            }}
          />
        </>
      )}
    </g>
  );
}

export function OrbPath({ orbs, accentColor }: OrbPathProps) {
  if (orbs.length < 2) return null;

  // Calculate connector positions
  // Assuming vertical spacing of 220px between orbs
  const verticalSpacing = 220;
  const centerX = 200; // Center of viewBox (400/2)

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 400 2000"
    >
      {orbs.slice(0, -1).map((orb, index) => {
        const nextOrb = orbs[index + 1];

        // Calculate positions based on zigzag pattern
        const fromX = centerX + (orb.position.xPercent * 1.5); // Convert percent to px within viewBox
        const fromY = orb.position.yIndex * verticalSpacing + 100; // Offset from top

        const toX = centerX + (nextOrb.position.xPercent * 1.5);
        const toY = nextOrb.position.yIndex * verticalSpacing + 100;

        // Connector is active if current orb is completed or active
        const isActive = orb.state === 'COMPLETED' || orb.state === 'ACTIVE';

        return (
          <Connector
            key={`${orb.id}-${nextOrb.id}`}
            from={{ x: fromX, y: fromY }}
            to={{ x: toX, y: toY }}
            isActive={isActive}
            accentColor={accentColor}
            index={index}
          />
        );
      })}
    </svg>
  );
}
