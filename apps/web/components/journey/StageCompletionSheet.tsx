/**
 * StageCompletionSheet - Celebration popup when user completes a stage
 *
 * Features:
 * - Shows completed stage info with color theming
 * - Displays points earned from all tasks in the stage
 * - Preview of next stage (if available)
 * - Triggers confetti animation on mount
 * - CTA button to navigate to next stage
 * - RTL-ready with Hebrew text
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Confetti } from "./Confetti";
import { Trophy, ArrowLeft, Sparkles } from "lucide-react";
import { Stage } from "@/lib/journey/stages/useStages";

interface StageCompletionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  completedStage: Stage;
  nextStage?: Stage | null;
  pointsEarned: number;
  onContinueToNext?: () => void;
}

export function StageCompletionSheet({
  isOpen,
  onClose,
  completedStage,
  nextStage,
  pointsEarned,
  onContinueToNext,
}: StageCompletionSheetProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Trigger confetti when sheet opens
  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      // Auto-hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
    }
  }, [isOpen]);

  const handleContinue = () => {
    if (onContinueToNext) {
      onContinueToNext();
    }
    onClose();
  };

  return (
    <>
      {/* Confetti overlay */}
      <Confetti trigger={showConfetti} duration={3000} />

      {/* Drawer sheet */}
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent
          className="bg-gradient-to-b from-neutral-900 to-black border-t border-neutral-800"
          dir="rtl"
        >
          <div className="max-w-lg mx-auto w-full px-6 pb-8">
            {/* Header */}
            <DrawerHeader className="text-center pt-2 pb-6">
              {/* Trophy Icon with stage color */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
                className="mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: `${completedStage.color_hex}20`,
                  border: `2px solid ${completedStage.color_hex}`,
                }}
              >
                <Trophy
                  className="w-10 h-10"
                  style={{ color: completedStage.color_hex }}
                />
              </motion.div>

              <DrawerTitle className="text-2xl font-black text-white mb-2">
                🎉 כל הכבוד!
              </DrawerTitle>
              <DrawerDescription className="text-neutral-400 text-base">
                השלמת את השלב בהצלחה
              </DrawerDescription>
            </DrawerHeader>

            {/* Completed Stage Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-neutral-800/50 rounded-2xl p-6 mb-4 border border-neutral-700"
            >
              <div className="flex items-start gap-4">
                {/* Stage color indicator */}
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: completedStage.color_hex }}
                >
                  <span className="text-2xl font-black text-black">
                    {completedStage.stage_index}
                  </span>
                </div>

                {/* Stage details */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {completedStage.title_he}
                  </h3>
                  {completedStage.subtitle_he && (
                    <p className="text-sm text-neutral-400">
                      {completedStage.subtitle_he}
                    </p>
                  )}
                </div>
              </div>

              {/* Points earned */}
              <div className="mt-6 pt-4 border-t border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>נקודות שהרווחת</span>
                  </span>
                  <span className="text-2xl font-black text-[#E2F163]">
                    +{pointsEarned}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Next Stage Preview */}
            {nextStage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-neutral-800/30 to-neutral-900/30 rounded-2xl p-6 mb-6 border border-neutral-700/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ArrowLeft className="w-4 h-4 text-neutral-500 rotate-180" />
                  <span className="text-sm font-medium text-neutral-500">
                    השלב הבא
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  {/* Next stage color indicator */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: nextStage.color_hex }}
                  >
                    <span className="text-lg font-black text-black">
                      {nextStage.stage_index}
                    </span>
                  </div>

                  {/* Next stage details */}
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-white">
                      {nextStage.title_he}
                    </h4>
                    {nextStage.subtitle_he && (
                      <p className="text-xs text-neutral-500">
                        {nextStage.subtitle_he}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col gap-3"
            >
              {/* Primary CTA - Continue to next stage */}
              {nextStage && (
                <button
                  onClick={handleContinue}
                  className="w-full py-4 bg-[#E2F163] text-black font-bold text-lg rounded-xl active:scale-[0.98] transition-transform"
                  style={{
                    boxShadow: "0 4px 20px rgba(226, 241, 99, 0.3)",
                  }}
                >
                  המשך לשלב הבא
                </button>
              )}

              {/* Secondary - Close button (if no next stage or as alternative) */}
              <button
                onClick={onClose}
                className="w-full py-3 bg-neutral-800 text-white font-medium rounded-xl active:opacity-80 transition-opacity"
              >
                {nextStage ? "סגור" : "המשך"}
              </button>
            </motion.div>

            {/* Completion stats (optional enhancement) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-center"
            >
              <p className="text-xs text-neutral-500">
                השלמת {completedStage.tasks.length} משימות בשלב זה
              </p>
            </motion.div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
