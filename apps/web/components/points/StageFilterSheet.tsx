/**
 * StageFilterSheet - Bottom sheet for filtering points by stage
 *
 * Shows all user stages and allows selecting one to filter the points feed
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, Trophy } from 'lucide-react';

interface StageFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  stages: Array<{
    stageId: string;
    stageTitle: string;
    points: number;
    completedTasks: number;
  }>;
  selectedStageId: string | null;
  onSelectStage: (stageId: string | null) => void;
  accentColor?: string;
}

export function StageFilterSheet({
  isOpen,
  onClose,
  stages,
  selectedStageId,
  onSelectStage,
  accentColor = '#E2F163',
}: StageFilterSheetProps) {
  const handleSelectStage = (stageId: string | null) => {
    onSelectStage(stageId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[119] bg-black/40 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
            }}
            className="fixed inset-x-0 bottom-0 z-[120] rounded-t-3xl bg-[#1a1b20] border-t border-white/10 max-h-[80vh] flex flex-col"
            dir="rtl"
          >
            {/* Handle bar */}
            <div className="w-12 h-1 rounded-full bg-white/20 mx-auto mt-3 mb-4" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white/80" />
            </button>

            {/* Header */}
            <div className="px-6 pb-4">
              <h2 className="text-2xl font-bold text-white text-right">סנן לפי שלב</h2>
              <p className="text-sm text-zinc-400 text-right mt-1">
                בחר שלב להצגת נקודות ספציפיות
              </p>
            </div>

            {/* Scrollable content */}
            <div className="px-5 overflow-y-auto flex-1 pb-[calc(env(safe-area-inset-bottom)+80px)]">
              <div className="space-y-3">
                {/* Show All option */}
                <button
                  onClick={() => handleSelectStage(null)}
                  className={`
                    w-full rounded-2xl px-4 py-4 flex flex-row-reverse items-center justify-between transition-all
                    ${
                      selectedStageId === null
                        ? 'bg-zinc-900/80 border-2 shadow-[0_0_0_1px_rgba(226,241,99,0.4)]'
                        : 'bg-zinc-900/50 border border-zinc-800/70 hover:bg-zinc-800/80'
                    }
                  `}
                  style={
                    selectedStageId === null
                      ? { borderColor: `${accentColor}80` }
                      : undefined
                  }
                >
                  {/* Left side: Checkmark */}
                  <div className="flex-shrink-0">
                    {selectedStageId === null && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                      >
                        <CheckCircle2
                          className="w-6 h-6"
                          style={{ color: accentColor }}
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Right side: Title */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end text-right">
                      <h3 className="text-base font-semibold text-white">
                        כל השלבים
                      </h3>
                      <p className="text-xs text-zinc-400">
                        הצג את כל ההיסטוריה
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-zinc-400" />
                    </div>
                  </div>
                </button>

                {/* Stage options */}
                {stages.map((stage, index) => {
                  const isSelected = selectedStageId === stage.stageId;

                  return (
                    <motion.button
                      key={stage.stageId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectStage(stage.stageId)}
                      className={`
                        w-full rounded-2xl px-4 py-4 flex flex-row-reverse items-center justify-between transition-all
                        ${
                          isSelected
                            ? 'bg-zinc-900/80 border-2 shadow-[0_0_0_1px_rgba(226,241,99,0.4)]'
                            : 'bg-zinc-900/50 border border-zinc-800/70 hover:bg-zinc-800/80'
                        }
                      `}
                      style={
                        isSelected
                          ? { borderColor: `${accentColor}80` }
                          : undefined
                      }
                    >
                      {/* Left side: Checkmark if selected */}
                      <div className="flex-shrink-0">
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', bounce: 0.5 }}
                          >
                            <CheckCircle2
                              className="w-6 h-6"
                              style={{ color: accentColor }}
                            />
                          </motion.div>
                        )}
                      </div>

                      {/* Right side: Stage info */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end text-right">
                          <h3 className="text-base font-semibold text-white">
                            {stage.stageTitle}
                          </h3>
                          <p className="text-xs text-zinc-400">
                            {stage.points} נקודות · {stage.completedTasks} משימות
                          </p>
                        </div>

                        {/* Points badge */}
                        <div
                          className="px-3 py-1.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${accentColor}20`,
                            color: accentColor,
                          }}
                        >
                          {stage.points}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
