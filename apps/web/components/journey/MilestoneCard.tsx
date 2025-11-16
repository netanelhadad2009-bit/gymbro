/**
 * MilestoneCard - 3D glass card for journey tasks
 *
 * Visual layers:
 * 1. Base glass with backdrop blur
 * 2. Accent ring with avatar color
 * 3. Progress ring with glow
 */

'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Lock, Zap, Scale, UtensilsCrossed, TrendingUp, CalendarDays } from 'lucide-react';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { hapticSelect } from '@/lib/haptics';
import { StageTask } from '@/lib/journey/stages/useStages';

interface MilestoneCardProps {
  task: StageTask;
  avatarColor?: string;
  isActive?: boolean;
  isLocked?: boolean;
  onOpen: (task: StageTask) => void;
}

// Get icon for task type
function getTaskIcon(keyCode: string) {
  if (keyCode.includes('WEIGH')) return Scale;
  if (keyCode.includes('MEAL')) return UtensilsCrossed;
  if (keyCode.includes('PROTEIN')) return TrendingUp;
  if (keyCode.includes('STREAK')) return CalendarDays;
  return Zap;
}

export function MilestoneCard({
  task,
  avatarColor = '#E2F163',
  isActive = false,
  isLocked = false,
  onOpen,
}: MilestoneCardProps) {
  const isCompleted = task.is_completed;
  const TaskIcon = getTaskIcon(task.key_code);

  // Determine colors based on state
  let glowColor = avatarColor;
  let ringColor = avatarColor;
  let bgOpacity = 'bg-zinc-900/50';
  let borderColor = 'border-zinc-700/50';

  if (isCompleted) {
    glowColor = '#10b981'; // emerald
    ringColor = '#10b981';
    bgOpacity = 'bg-emerald-500/10';
    borderColor = 'border-emerald-500/30';
  } else if (isLocked) {
    glowColor = '#71717a'; // zinc
    ringColor = '#71717a';
    bgOpacity = 'bg-zinc-900/30';
    borderColor = 'border-zinc-800/50';
  } else if (isActive) {
    bgOpacity = 'bg-zinc-900/60';
    borderColor = 'border-lime-500/30';
  }

  const handleClick = () => {
    if (!isLocked) {
      hapticSelect();
      onOpen(task);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full"
      style={{ perspective: '1000px' }}
    >
      <motion.button
        onClick={handleClick}
        disabled={isLocked}
        className={`
          relative w-full p-5 rounded-2xl backdrop-blur-md
          ${bgOpacity} ${borderColor}
          border-2 transition-all duration-300
          ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]'}
          ${isActive && !isCompleted ? 'shadow-2xl' : 'shadow-lg'}
        `}
        style={{
          transformStyle: 'preserve-3d',
          transform: isActive && !isCompleted ? 'translateZ(10px)' : 'translateZ(0)',
          willChange: 'transform',
        }}
        whileHover={!isLocked ? { rotateX: -2, rotateY: 1 } : {}}
        whileTap={!isLocked ? { scale: 0.98 } : {}}
      >
        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 rounded-2xl opacity-5 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='noise'%3E%3CfeTurbulence baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Active glow effect */}
        {isActive && !isCompleted && !isLocked && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: `0 0 40px ${glowColor}40, 0 0 80px ${glowColor}20`,
            }}
            animate={{
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        <div className="relative z-10 flex items-center gap-4">
          {/* Left side - Progress Ring */}
          <div className="flex-shrink-0">
            {isCompleted ? (
              <div className="relative">
                <CheckCircle2 className="w-14 h-14 text-emerald-400" />
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: `0 0 20px ${glowColor}60`,
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
              </div>
            ) : isLocked ? (
              <div className="w-14 h-14 rounded-full bg-zinc-800/50 flex items-center justify-center">
                <Lock className="w-6 h-6 text-zinc-500" />
              </div>
            ) : (
              <ProgressRing
                value={task.progress}
                size={56}
                strokeWidth={4}
                color={ringColor}
                showGlow={isActive}
              />
            )}
          </div>

          {/* Center - Content */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h3 className="text-lg font-bold text-white leading-tight">
                {task.title_he}
              </h3>
              {/* Points badge */}
              <div className="flex-shrink-0 px-3 py-1 rounded-full bg-zinc-800/50 border border-zinc-700">
                <span className="text-sm font-bold text-lime-400">
                  {task.points}
                </span>
              </div>
            </div>

            {task.desc_he && (
              <p className="text-sm text-zinc-400 leading-relaxed">
                {task.desc_he}
              </p>
            )}

            {/* Progress text */}
            {!isCompleted && !isLocked && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: ringColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress * 100}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs text-zinc-500">
                  {task.current !== undefined && task.target !== undefined
                    ? `${task.current}/${task.target}`
                    : `${Math.round(task.progress * 100)}%`
                  }
                </span>
              </div>
            )}
          </div>

          {/* Right - Icon */}
          <div
            className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
              ${isCompleted ? 'bg-emerald-500/20' : 'bg-zinc-800/50'}
            `}
          >
            <TaskIcon
              className="w-5 h-5"
              style={{
                color: isCompleted ? '#10b981' : isActive ? avatarColor : '#71717a'
              }}
            />
          </div>
        </div>

        {/* Completed overlay */}
        {isCompleted && (
          <div className="absolute inset-0 rounded-2xl pointer-events-none">
            <div
              className="absolute inset-0 rounded-2xl opacity-10"
              style={{
                background: `linear-gradient(135deg, transparent, ${glowColor})`,
              }}
            />
          </div>
        )}

        {/* Locked overlay */}
        {isLocked && (
          <div className="absolute inset-0 rounded-2xl bg-zinc-900/50 pointer-events-none" />
        )}
      </motion.button>
    </motion.div>
  );
}