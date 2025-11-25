/**
 * Journey Page - Linear Stage System
 *
 * Features:
 * - 3+ linear stages with tasks
 * - Avatar-driven personalization
 * - Bottom stage switcher
 * - Real-time progress tracking
 * - Lock → Active → Complete progression
 */

"use client";

import "./journey.css";
import { useState, useEffect } from "react";
import { useOrbs, OrbTask } from "@/lib/journey/stages/useOrbs";
import { useAvatar } from "@/lib/avatar/useAvatar";
import { StagePickerSheet } from "@/components/journey/StagePickerSheet";
import { OrbMap } from "@/components/journey/OrbMap";
import { OrbDetailSheet } from "@/components/journey/OrbDetailSheet";
import { StageCompletionSheet } from "@/components/journey/StageCompletionSheet";
import { MapFrame } from "@/components/journey/MapFrame";
import { uiBus } from "@/lib/ui/eventBus";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Confetti } from "@/components/journey/Confetti";
import FlameClean from "@/components/streak/FlameClean";
import { PointsSummaryCard } from "@/components/journey/PointsSummaryCard";
import { usePointsSummary } from "@/lib/points/usePoints";
import { Stage } from "@/lib/journey/stages/useStages";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function JourneyPage() {
  const { avatar, colorToken } = useAvatar();

  // Use avatar color or fall back to default accent color
  const accentColor = colorToken || "#E2F163";

  const {
    orbs,
    focusOrbIndex,
    stages,
    activeStageIndex,
    selectedStageIndex,
    selectedStage,
    isLoading,
    error,
    isCompleting,
    setSelectedStageIndex,
    completeTask,
    refetch,
  } = useOrbs(accentColor);

  const [showConfetti, setShowConfetti] = useState(false);
  const [streak, setStreak] = useState<number>(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedOrb, setSelectedOrb] = useState<OrbTask | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [showStageCompletionSheet, setShowStageCompletionSheet] = useState(false);
  const [completedStageData, setCompletedStageData] = useState<{
    stage: Stage;
    nextStage: Stage | null;
    pointsEarned: number;
  } | null>(null);
  const router = useRouter();

  // Fetch points summary
  const { summary: pointsSummary, isLoading: isPointsLoading } = usePointsSummary();

  // Listen for event bus to open stage picker
  useEffect(() => {
    const unsubscribe = uiBus.on('open-stage-picker', () => {
      setSheetOpen(true);
    });
    return unsubscribe;
  }, []);

  // Fetch streak data
  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const response = await fetch("/api/streak/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "journey" }),
        });

        if (response.ok) {
          const data = await response.json();
          const streakValue = data?.data?.current;
          if (typeof streakValue === "number") {
            setStreak(streakValue);
          }
        }
      } catch (error) {
        console.error("[Journey] Failed to fetch streak:", error);
      }
    };

    fetchStreak();
  }, []);

  // Handle opening orb detail sheet
  const handleOpenOrb = (orb: OrbTask) => {
    setSelectedOrb(orb);
    setDetailSheetOpen(true);
  };

  // Handle task completion from detail sheet
  const handleCompleteTask = async (taskId: string) => {
    if (!selectedOrb) return;

    // completeTask already refetches stages internally, so no need to call refetch() manually
    const result = await completeTask(selectedOrb.stageId, taskId);

    if (result.ok) {
      // Show confetti for task completion
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);

      // Check if stage was completed
      if (result.stageCompleted && selectedStage) {
        // Calculate total points earned from this stage
        const stagePointsEarned = selectedStage.tasks.reduce((sum, task) => sum + task.points, 0);

        // Find the next stage
        const currentStageIndex = stages.findIndex(s => s.id === selectedStage.id);
        const nextStage = currentStageIndex >= 0 && currentStageIndex < stages.length - 1
          ? stages[currentStageIndex + 1]
          : null;

        // Store completion data
        setCompletedStageData({
          stage: selectedStage,
          nextStage,
          pointsEarned: stagePointsEarned,
        });

        // Close the detail sheet immediately
        setDetailSheetOpen(false);
        setSelectedOrb(null);

        // Show stage completion sheet after a brief delay (for better UX)
        setTimeout(() => {
          setShowStageCompletionSheet(true);
        }, 500);
      } else {
        // Regular task completion (not completing the entire stage)
        // Close the detail sheet after a short delay to show the completion animation
        setTimeout(() => {
          setDetailSheetOpen(false);
          setSelectedOrb(null);
        }, 2000);
      }
    } else {
      throw new Error(result.message || result.error || 'לא ניתן להשלים משימה');
    }
  };

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#0e0f12] to-[#1a1b20] flex items-center justify-center" dir="rtl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center p-8 rounded-3xl bg-gradient-to-br from-neutral-900/95 to-black/95 backdrop-blur-xl border border-orange-500/20"
        >
          <AlertTriangle className="w-16 h-16 text-orange-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-3">שגיאת חיבור</h2>
          <p className="text-neutral-400 mb-8">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-gradient-to-r from-orange-400 to-orange-500 text-black font-bold rounded-2xl"
          >
            נסה שוב
          </button>
        </motion.div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <LoadingScreen message="טוען את המסע שלך..." />;
  }

  // No stages state
  if (stages.length === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-[#0e0f12] to-[#1a1b20] flex items-center justify-center" dir="rtl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 text-center p-8 rounded-3xl bg-gradient-to-br from-neutral-900/95 to-black/95 backdrop-blur-xl border border-zinc-800"
        >
          <h2 className="text-2xl font-black text-white mb-3">אין שלבים זמינים</h2>
          <p className="text-neutral-400 mb-8">יש ליצור שלבים למסע שלך</p>
          <button
            onClick={async () => {
              const response = await fetch("/api/journey/stages/bootstrap", { method: "POST" });
              if (response.ok) {
                window.location.reload();
              }
            }}
            className="px-8 py-4 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-bold rounded-2xl"
          >
            צור שלבים
          </button>
        </motion.div>
      </div>
    );
  }

  const isActiveStage = selectedStageIndex === activeStageIndex;
  const isLockedStage = selectedStage && !selectedStage.is_unlocked && !selectedStage.is_completed;
  const showGoToActiveButton = !isActiveStage && activeStageIndex !== null;

  // Handler to navigate to active stage
  const handleGoToActiveStage = () => {
    if (activeStageIndex !== null) {
      setSelectedStageIndex(activeStageIndex);
    }
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto overscroll-contain bg-gradient-to-b from-[#0e0f12] to-[#1a1b20]" dir="rtl">
      {/* Confetti */}
      <Confetti trigger={showConfetti} />

      {/* Header - no longer sticky, scrolls with content */}
      <header className="px-4 pb-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
        <div className="flex items-center justify-between gap-3">
          {/* Title and Stage Selector */}
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              מסע הכושר שלי
            </h1>
            {selectedStage && (
              <button
                onClick={() => setSheetOpen(true)}
                className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors text-right flex items-center gap-1"
              >
                <span>{selectedStage.title_he}</span>
                <span className="text-zinc-500">•</span>
                <span className="underline">שנה שלב</span>
              </button>
            )}
          </div>

          {/* Streak Button */}
          <button
            aria-label="רצף ימים"
            onClick={() => router.push("/streak")}
            className="rounded-full px-4 py-2 backdrop-blur border-2 text-white flex items-center gap-2 transition-all"
            style={{
              backgroundColor: `${accentColor}10`,
              borderColor: `${accentColor}30`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${accentColor}20`;
              e.currentTarget.style.borderColor = `${accentColor}50`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${accentColor}10`;
              e.currentTarget.style.borderColor = `${accentColor}30`;
            }}
          >
            <span className="font-semibold text-sm">{streak}</span>
            <FlameClean width={16} />
          </button>
        </div>

        {/* Points Summary Card */}
        <div className="mt-3 flex justify-end">
          <PointsSummaryCard
            total={pointsSummary?.total || 0}
            onPress={() => router.push("/points")}
            isLoading={isPointsLoading}
            accentColor={accentColor}
          />
        </div>
      </header>

      {/* Orb Map */}
      <main className="px-4 mt-6 pb-8">
        <MapFrame constrainHeight={false}>
          {/* Go to Active Stage Button - show when viewing non-active stage */}
          {showGoToActiveButton && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <button
                onClick={handleGoToActiveStage}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-zinc-800 to-zinc-900 border-2 border-lime-500/30 text-white font-bold shadow-lg transition-all hover:border-lime-500/50"
              >
                <div className="flex items-center justify-center gap-2">
                  <span>עבור לשלב הנוכחי</span>
                  <motion.div
                    animate={{ x: [0, -4, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ←
                  </motion.div>
                </div>
              </button>
            </motion.div>
          )}

          {/* Locked Stage Info Banner */}
          {isLockedStage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-zinc-500" />
                <h3 className="text-lg font-bold text-zinc-400">שלב נעול</h3>
              </div>
              <p className="text-sm text-zinc-500">
                כל המשימות בשלב זה נעולות. השלם את השלב הקודם כדי לפתוח.
              </p>
            </motion.div>
          )}

          {/* Orb Map - always show, tasks will be locked if stage is locked */}
          <OrbMap
            orbs={orbs}
            accentColor={accentColor}
            onOrbTap={handleOpenOrb}
            focusOrbIndex={focusOrbIndex}
          />
        </MapFrame>
      </main>

      {/* Stage Picker Sheet */}
      <StagePickerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        stages={stages}
        selectedStageIndex={selectedStageIndex}
        activeStageIndex={activeStageIndex}
        onSelectStage={setSelectedStageIndex}
        accentColor={accentColor}
      />

      {/* Orb Detail Sheet */}
      <OrbDetailSheet
        orb={selectedOrb}
        open={detailSheetOpen}
        onOpenChange={(open) => {
          setDetailSheetOpen(open);
          if (!open) {
            setSelectedOrb(null);
          }
        }}
        onComplete={handleCompleteTask}
        onGoToActiveStage={handleGoToActiveStage}
      />

      {/* Stage Completion Sheet */}
      {completedStageData && (
        <StageCompletionSheet
          isOpen={showStageCompletionSheet}
          onClose={() => {
            setShowStageCompletionSheet(false);
            setCompletedStageData(null);
          }}
          completedStage={completedStageData.stage}
          nextStage={completedStageData.nextStage}
          pointsEarned={completedStageData.pointsEarned}
          onContinueToNext={() => {
            if (completedStageData.nextStage) {
              // Navigate to next stage
              const nextStageIndex = stages.findIndex(
                s => s.id === completedStageData.nextStage!.id
              );
              if (nextStageIndex >= 0) {
                setSelectedStageIndex(nextStageIndex);
              }
            }
          }}
        />
      )}
    </div>
  );
}
