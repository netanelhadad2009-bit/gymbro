/**
 * OrbNode - 3D glowing orb for journey tasks
 *
 * Visual layers:
 * 1. Outer glow (pulsing for ACTIVE)
 * 2. Glass sphere with backdrop blur
 * 3. Progress ring with glow filter
 * 4. Center icon
 * 5. Orbiting specks (ACTIVE only)
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Lock } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { hapticSelect } from '@/lib/haptics';
import { OrbTask } from '@/lib/journey/stages/useOrbs';

interface OrbNodeProps {
  orb: OrbTask;
  onTap: (orb: OrbTask) => void;
  delayIndex?: number;
}

export const OrbNode = React.memo(({ orb, onTap, delayIndex = 0 }: OrbNodeProps) => {
  const { state, progress, icon: Icon, accentHex, title, points } = orb;

  const isActive = state === 'ACTIVE';
  const isCompleted = state === 'COMPLETED';
  const isLocked = state === 'LOCKED';

  const handleClick = () => {
    // Allow clicking on locked orbs to view details
    hapticSelect();
    onTap(orb);
  };

  // Size configuration
  const orbSize = 'w-[160px] h-[160px] md:w-[180px] md:h-[180px]';
  const iconSize = isCompleted ? 'w-16 h-16' : 'w-12 h-12';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: delayIndex * 0.1,
      }}
      className="relative"
      style={{ perspective: '1000px' }}
    >
      {/* Outer glow layer */}
      {isActive && (
        <motion.div
          className={`absolute inset-0 ${orbSize} rounded-full pointer-events-none`}
          style={{
            boxShadow: `0 0 40px ${accentHex}40, 0 0 80px ${accentHex}20`,
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Main orb button */}
      <motion.button
        onClick={handleClick}
        className={`
          relative ${orbSize} rounded-full cursor-pointer
          ${isLocked ? 'opacity-60 grayscale' : ''}
          focus:outline-none focus-visible:ring-4 focus-visible:ring-lime-400/50
        `}
        style={{ transformStyle: 'preserve-3d' }}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.98 }}
        aria-label={`${title} - ${points} נקודות${isLocked ? ' (נעול)' : ''}`}
        aria-disabled={isLocked}
      >
        {/* Glass sphere base */}
        <div
          className={`
            absolute inset-0 rounded-full backdrop-blur-md
            border-2 overflow-hidden
            ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/30' :
              isActive ? 'bg-zinc-900/60 border-lime-500/30' :
              'bg-zinc-900/30 border-zinc-700/50'
            }
          `}
        >
          {/* Noise texture overlay */}
          <div
            className="absolute inset-0 opacity-5 pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Gradient shine */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${accentHex}40, transparent 70%)`,
            }}
          />
        </div>

        {/* Progress ring */}
        {!isCompleted && !isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ProgressRing
              value={progress}
              size={160}
              strokeWidth={6}
              color={accentHex}
              showGlow={isActive}
            />
          </div>
        )}

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          {isCompleted ? (
            <>
              <CheckCircle2 className={`${iconSize} text-emerald-400`} />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: `0 0 20px #10b98160`,
                }}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </>
          ) : isLocked ? (
            <div className="flex flex-col items-center gap-2">
              <Lock className="w-8 h-8 text-zinc-500" />
              <span className="text-xs text-zinc-600 font-semibold">נעול</span>
            </div>
          ) : (
            <>
              <Icon
                className={iconSize}
                style={{ color: accentHex }}
              />
              {/* Progress percentage mini badge */}
              {isActive && progress > 0 && progress < 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-zinc-700"
                >
                  <span className="text-xs font-bold text-white">
                    {Math.round(progress * 100)}%
                  </span>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Orbiting specks (ACTIVE only) */}
        {isActive && (
          <>
            {[0, 120, 240].map((angle, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  backgroundColor: accentHex,
                  boxShadow: `0 0 8px ${accentHex}`,
                  top: '50%',
                  left: '50%',
                }}
                animate={{
                  rotate: [angle, angle + 360],
                  x: [
                    Math.cos((angle * Math.PI) / 180) * 85,
                    Math.cos(((angle + 360) * Math.PI) / 180) * 85,
                  ],
                  y: [
                    Math.sin((angle * Math.PI) / 180) * 85,
                    Math.sin(((angle + 360) * Math.PI) / 180) * 85,
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'linear',
                  delay: i * 0.3,
                }}
              />
            ))}
          </>
        )}

        {/* Points badge */}
        <motion.div
          className="absolute -top-2 -right-2 z-20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delayIndex * 0.1 + 0.2, type: 'spring' }}
        >
          <div className="px-3 py-1 rounded-full bg-zinc-900/95 backdrop-blur-sm border-2 border-lime-400/30 shadow-lg">
            <span className="text-sm font-bold text-lime-400">
              {points}
            </span>
          </div>
        </motion.div>
      </motion.button>

      {/* Title label below orb */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delayIndex * 0.1 + 0.3 }}
        className="mt-4 text-center"
      >
        <p className="text-sm font-bold text-white leading-tight px-2">
          {title}
        </p>
      </motion.div>
    </motion.div>
  );
});

OrbNode.displayName = 'OrbNode';
