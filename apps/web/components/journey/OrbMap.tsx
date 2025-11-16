/**
 * OrbMap - Main layout for orb nodes with zigzag positioning
 *
 * Features:
 * - Vertical path of orbs with zigzag pattern
 * - Animated connectors between nodes
 * - Responsive layout with safe-area padding
 * - Auto-scroll to active orb
 */

'use client';

import { useRef, useEffect } from 'react';
import { OrbNode } from './OrbNode';
import { EnergyConnector } from './EnergyConnector';
import { OrbTask } from '@/lib/journey/stages/useOrbs';

interface OrbMapProps {
  orbs: OrbTask[];
  accentColor: string;
  onOrbTap: (orb: OrbTask) => void;
  focusOrbIndex?: number;
}

export function OrbMap({ orbs, accentColor, onOrbTap, focusOrbIndex }: OrbMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-scroll to active orb on mount
  useEffect(() => {
    if (focusOrbIndex !== undefined && focusOrbIndex >= 0) {
      const timeout = setTimeout(() => {
        const targetOrb = orbRefs.current[focusOrbIndex];
        if (targetOrb) {
          targetOrb.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 600); // Wait for entrance animations

      return () => clearTimeout(timeout);
    }
  }, [focusOrbIndex]);

  if (orbs.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-zinc-500 text-center">אין משימות זמינות</p>
      </div>
    );
  }

  // Constants for positioning
  const VERTICAL_SPACING = 280; // Space between orbs in pixels
  const CONTAINER_CENTER = 200; // Horizontal center in SVG coordinates

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-hidden"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)',
      }}
    >
      {/* Energy connectors layer */}
      <div className="absolute inset-0 w-full pointer-events-none" style={{ zIndex: 1 }}>
        {orbs.map((orb, index) => {
          const nextOrb = orbs[index + 1];
          if (!nextOrb) return null;

          // Calculate positions in container coordinates
          const fromX = CONTAINER_CENTER + (orb.position.xPercent * 2); // Scale for visibility
          const fromY = index * VERTICAL_SPACING + 120; // Start position

          const toX = CONTAINER_CENTER + (nextOrb.position.xPercent * 2);
          const toY = (index + 1) * VERTICAL_SPACING + 120;

          // Connector is active if current orb is completed
          const isActive = orb.state === 'COMPLETED';

          return (
            <EnergyConnector
              key={`connector-${orb.id}-${nextOrb.id}`}
              fromX={fromX}
              fromY={fromY}
              toX={toX}
              toY={toY}
              active={isActive}
              index={index}
            />
          );
        })}
      </div>

      {/* Orb nodes in zigzag pattern */}
      <div className="relative z-10 flex flex-col items-center gap-12 pt-12">
        {orbs.map((orb, index) => {
          // Calculate horizontal offset for zigzag
          const xOffset = `${orb.position.xPercent}%`;

          return (
            <div
              key={orb.id}
              ref={(el) => { orbRefs.current[index] = el; }}
              className="flex justify-center w-full"
              style={{
                transform: `translateX(${xOffset})`,
              }}
            >
              <OrbNode
                orb={orb}
                onTap={onOrbTap}
                delayIndex={index}
              />
            </div>
          );
        })}
      </div>

      {/* Subtle starfield background (optional enhancement) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20" style={{ zIndex: 0 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle, ${accentColor}20 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
    </div>
  );
}
