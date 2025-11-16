/**
 * StageTabs - Bottom navigation bar for stages
 *
 * Fixed bottom bar with horizontal pills for each stage
 * Shows lock/complete/active states with avatar color theming
 */

'use client';

import { motion } from 'framer-motion';
import { Lock, CheckCircle2 } from 'lucide-react';
import { Stage } from '@/lib/journey/stages/useStages';

interface StageTabsProps {
  stages: Stage[];
  selectedStageIndex: number;
  activeStageIndex: number | null;
  onSelectStage: (index: number) => void;
  accentColor?: string;
}

export function StageTabs({
  stages,
  selectedStageIndex,
  activeStageIndex,
  onSelectStage,
  accentColor = '#E2F163',
}: StageTabsProps) {
  return (
    <div
      className="fixed left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 z-40"
      style={{ bottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      dir="rtl"
    >
      {/* Scrollable container for tabs */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-4 py-2 min-w-max">
          {stages.map((stage, index) => {
            const isSelected = index === selectedStageIndex;
            const isActive = index === activeStageIndex;
            const isCompleted = stage.is_completed;
            const isLocked = !stage.is_unlocked && !isCompleted;

            // Determine colors
            let bgColor = 'bg-zinc-800';
            let textColor = 'text-zinc-400';
            let borderColor = 'border-zinc-700';

            if (isCompleted) {
              bgColor = 'bg-emerald-500/20';
              textColor = 'text-emerald-400';
              borderColor = 'border-emerald-500/50';
            } else if (isActive && isSelected) {
              bgColor = `bg-[${accentColor}]/20`;
              textColor = 'text-white';
              borderColor = `border-[${accentColor}]/50`;
            } else if (isSelected) {
              bgColor = 'bg-zinc-700';
              textColor = 'text-white';
              borderColor = 'border-zinc-600';
            }

            if (isLocked) {
              textColor = 'text-zinc-600';
            }

            return (
              <motion.button
                key={stage.id}
                onClick={() => {
                  if (!isLocked) {
                    onSelectStage(index);
                  }
                }}
                disabled={isLocked}
                className={`
                  relative flex items-center gap-2 px-3 py-2 rounded-full
                  border-2 transition-all duration-200
                  ${bgColor} ${borderColor} ${textColor}
                  ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:brightness-110'}
                  ${isSelected ? 'scale-105 shadow-lg' : ''}
                  min-w-[100px] justify-center
                `}
                style={
                  isActive && isSelected && !isCompleted
                    ? {
                        backgroundColor: `${accentColor}20`,
                        borderColor: `${accentColor}50`,
                      }
                    : undefined
                }
                whileTap={isLocked ? undefined : { scale: 0.95 }}
                layout
              >
                {/* Icon */}
                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isLocked ? (
                    <Lock className="w-4 h-4 text-zinc-600" />
                  ) : (
                    <div
                      className="w-5 h-5 rounded-full border-2"
                      style={{
                        borderColor: isActive ? accentColor : 'currentColor',
                        backgroundColor:
                          isActive && isSelected ? `${accentColor}40` : 'transparent',
                      }}
                    />
                  )}
                </div>

                {/* Stage number and title */}
                <div className="flex flex-col items-start">
                  <span className="text-xs font-semibold leading-tight">שלב {stage.stage_index}</span>
                  <span className="text-[10px] opacity-80 line-clamp-1 leading-tight">
                    {stage.title_he}
                  </span>
                </div>

                {/* Active indicator glow */}
                {isActive && isSelected && !isCompleted && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      boxShadow: `0 0 20px ${accentColor}60`,
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
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Subtitle for selected stage - removed to save space */}
    </div>
  );
}
