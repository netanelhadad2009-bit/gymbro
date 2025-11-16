/**
 * StagePickerSheet - Bottom sheet for selecting journey stages
 *
 * Displays all stages with lock/active/complete states
 * Allows users to jump to any unlocked stage
 * Redesigned to match MilestoneDetailSheet visual style
 */

'use client';

import { motion } from 'framer-motion';
import { Lock, CheckCircle2 } from 'lucide-react';
import { Stage } from '@/lib/journey/stages/useStages';
import { ProgressRing } from '@/components/ui/ProgressRing';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerPortal,
  DrawerOverlay,
} from '@/components/ui/drawer';

interface StagePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  selectedStageIndex: number;
  activeStageIndex: number | null;
  onSelectStage: (index: number) => void;
  accentColor?: string;
}

export function StagePickerSheet({
  open,
  onOpenChange,
  stages,
  selectedStageIndex,
  activeStageIndex,
  onSelectStage,
  accentColor = '#E2F163',
}: StagePickerSheetProps) {
  const handleSelectStage = (index: number) => {
    const stage = stages[index];
    if (!stage) return;

    // Allow selection of any stage (including locked ones)
    // The journey page will handle showing locked tasks

    // Analytics
    if (typeof window !== 'undefined') {
      console.log('[StagePickerSheet] Stage selected:', {
        from: selectedStageIndex,
        to: index,
        stageName: stage.title_he,
        isLocked: !stage.is_unlocked && !stage.is_completed,
      });

      // Optional: Google Analytics
      if ('gtag' in window && typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'stage_switch', {
          from: selectedStageIndex,
          to: index,
          stage_name: stage.title_he,
        });
      }
    }

    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onSelectStage(index);
    onOpenChange(false);
  };

  // Track when sheet opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && typeof window !== 'undefined') {
      console.log('[StagePickerSheet] Sheet opened');
      if ('gtag' in window && typeof (window as any).gtag === 'function') {
        (window as any).gtag('event', 'stage_picker_open');
      }
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerPortal>
        <DrawerOverlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <DrawerContent className="fixed inset-x-0 bottom-0 z-50 outline-none border-0 !rounded-none !bg-transparent p-0 mt-0" dir="rtl">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="rounded-t-3xl bg-[#111119] overflow-hidden max-h-[85vh] flex flex-col"
            style={{
              paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
            }}
          >
            {/* Handle bar */}
            <div className="mx-auto mt-3 mb-2 h-1 w-12 rounded-full bg-zinc-600/60" />

            <DrawerHeader className="border-b border-zinc-800/80 pb-4 px-5 pt-1">
              <DrawerTitle className="text-xl font-bold text-white text-center">
                בחרו שלב
              </DrawerTitle>
              <p className="text-sm text-zinc-400 text-center mt-1">
                עברו בין שלבי המסע שלכם
              </p>
            </DrawerHeader>

            {/* Scrollable content */}
            <div className="px-5 py-4 overflow-y-auto flex-1" dir="rtl">
              <div className="space-y-3">
                {stages.map((stage, index) => {
                  const isSelected = index === selectedStageIndex;
                  const isActive = index === activeStageIndex;
                  const isCompleted = stage.is_completed;
                  const isLocked = !stage.is_unlocked && !isCompleted;

                  // Calculate task completion
                  const completedTasks = stage.tasks.filter(t => t.is_completed).length;
                  const totalTasks = stage.tasks.length;
                  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;

                  // Status badge text
                  let statusText = 'פעיל';
                  let statusColor = '#FF5A1F'; // orange
                  if (isLocked) {
                    statusText = 'נעול';
                    statusColor = '#71717a'; // zinc-500
                  } else if (isCompleted) {
                    statusText = 'הושלם';
                    statusColor = '#10b981'; // emerald-500
                  }

                  return (
                    <button
                      key={stage.id}
                      onClick={() => handleSelectStage(index)}
                      className={`
                        w-full rounded-2xl px-4 py-3 flex flex-row-reverse items-center justify-between transition-all
                        ${isLocked
                          ? 'bg-zinc-900/50 border border-zinc-800/70 opacity-60 cursor-pointer'
                          : 'bg-zinc-900/80 border border-zinc-800/70 hover:bg-zinc-800/80'
                        }
                        ${isSelected && isActive && !isCompleted
                          ? 'border-lime-400/80 shadow-[0_0_0_1px_rgba(226,241,99,0.4)]'
                          : ''
                        }
                      `}
                    >
                      {/* Left side (RTL): Status badge - DOM order first for flex-row-reverse */}
                      <div className="flex-shrink-0">
                        <div
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${statusColor}20`,
                            color: statusColor,
                          }}
                        >
                          {statusText}
                        </div>
                      </div>

                      {/* Right side (RTL): Circle + Text grouped together - DOM order second for flex-row-reverse */}
                      <div className="flex flex-row-reverse items-center gap-3">
                        {/* Stage info text next to circle */}
                        <div className="flex flex-col items-end text-right flex-1">
                          <div className="flex items-center gap-2 mb-1 w-full">
                            {isLocked && <Lock className="w-4 h-4 text-zinc-500 flex-shrink-0" />}
                            <h3 className="text-[15px] font-semibold text-white leading-tight text-right flex-1">
                              {stage.title_he}
                            </h3>
                          </div>

                          <p className="text-xs text-zinc-400 leading-tight w-full">
                            {isCompleted
                              ? 'כל המשימות הושלמו'
                              : `${completedTasks} מתוך ${totalTasks} משימות הושלמו`
                            }
                          </p>

                          {stage.subtitle_he && (
                            <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1 w-full">
                              {stage.subtitle_he}
                            </p>
                          )}
                        </div>

                        {/* Progress indicator on outer right */}
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                          ) : (
                            <ProgressRing
                              value={progress}
                              size={36}
                              strokeWidth={3}
                              color={isActive ? accentColor : '#71717a'}
                              showGlow={isActive && isSelected}
                            />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="px-5 pt-2 pb-2">
              <button
                onClick={handleConfirm}
                className="w-full h-12 rounded-2xl text-base font-semibold bg-[#FF5A1F] text-black hover:bg-[#ff6b36] transition-colors"
              >
                נהל משימות של שלב זה
              </button>

              <button
                onClick={() => onOpenChange(false)}
                className="mt-2 w-full text-xs text-zinc-500 text-center hover:text-zinc-400 transition-colors py-2"
              >
                לא עכשיו
              </button>
            </div>
          </motion.div>
        </DrawerContent>
      </DrawerPortal>
    </Drawer>
  );
}
