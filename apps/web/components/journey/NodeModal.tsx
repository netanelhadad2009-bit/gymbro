/**
 * NodeModal - Enhanced Journey Node Detail Modal
 *
 * Smooth bottom sheet modal with completion animations
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Trophy, Lock, CheckCircle2, Target, ChevronRight, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { JourneyNode } from "@/lib/journey/queries";
import { Confetti } from "./Confetti";

interface NodeModalProps {
  node: JourneyNode | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteNode: (nodeId: string) => Promise<void>;
  onRefresh?: () => void;
}

export function NodeModal({
  node,
  isOpen,
  onClose,
  onCompleteNode,
  onRefresh
}: NodeModalProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  if (!node) return null;

  const state = node.progress.state;
  const isLocked = state === "LOCKED";
  const isCompleted = state === "COMPLETED";
  const isActive = state === "ACTIVE";

  // Calculate progress for active nodes
  const conditions = node.conditions_json || {};
  const checklist = conditions.checklist || [];
  const completedTasks = node.progress.progress_json?.completed_tasks || [];
  const progress = checklist.length > 0 ? (completedTasks.length / checklist.length) * 100 : 0;

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleStartTask = useCallback(() => {
    const task = node.primary_task;

    // Route to relevant screen based on task type
    if (task === "weigh_in_today") {
      router.push("/progress#weight");
    } else if (task?.includes("log_") && task.includes("meal")) {
      router.push("/nutrition");
    } else if (task?.includes("protein")) {
      router.push("/nutrition");
    } else if (task?.includes("workout")) {
      router.push("/workouts");
    } else {
      // Fallback navigation
      router.push("/progress");
    }

    onClose();
  }, [node, router, onClose]);

  const handleComplete = async () => {
    if (isLocked || isCompleted || isProcessing) return;

    setIsProcessing(true);
    try {
      // Call the completion API
      await onCompleteNode(node.id);

      // Trigger celebration
      setShowConfetti(true);
      setJustCompleted(true);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Refresh data and close
      if (onRefresh) {
        onRefresh();
      }

      onClose();
    } catch (error) {
      console.error("Failed to complete node:", error);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setShowConfetti(false);
        setJustCompleted(false);
      }, 3000);
    }
  };

  const handleAction = async () => {
    if (isLocked || isCompleted) return;

    if (isActive && progress >= 100) {
      await handleComplete();
    } else {
      handleStartTask();
    }
  };

  const getActionButton = () => {
    if (isLocked) {
      return (
        <motion.button
          disabled
          className="w-full py-4 px-6 rounded-2xl bg-neutral-800 text-neutral-500 font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Lock className="w-5 h-5" />
          נעול - השלם שלבים קודמים
        </motion.button>
      );
    }

    if (isCompleted || justCompleted) {
      return (
        <motion.div
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-lime-400/20 to-lime-500/10 border border-lime-400/30 text-lime-400 font-bold text-lg flex items-center justify-center gap-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", bounce: 0.3 }}
        >
          <CheckCircle2 className="w-5 h-5" />
          {justCompleted ? "הושלם עכשיו! 🎉" : "הושלם בהצלחה"}
        </motion.div>
      );
    }

    if (isActive && progress >= 100) {
      return (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleComplete}
          disabled={isProcessing}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-lime-400 to-lime-500 text-black font-bold text-lg flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(163,230,53,0.3)] hover:shadow-[0_12px_40px_rgba(163,230,53,0.4)] transition-all"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {isProcessing ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-6 h-6" />
              </motion.div>
              משלים...
            </>
          ) : (
            <>
              <Trophy className="w-6 h-6" />
              סמן כהושלם
            </>
          )}
        </motion.button>
      );
    }

    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleStartTask}
        disabled={isProcessing}
        className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#E2F163] to-[#d4e350] text-black font-bold text-lg flex items-center justify-center gap-2 shadow-[0_8px_32px_rgba(226,241,99,0.3)] hover:shadow-[0_12px_40px_rgba(226,241,99,0.4)] transition-all"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Target className="w-6 h-6" />
        {isActive ? "המשך משימה" : "התחל משימה"}
        <ChevronRight className="w-5 h-5" />
      </motion.button>
    );
  };

  const getStateColor = () => {
    if (isCompleted) return "from-lime-400 to-lime-500";
    if (isActive) return "from-[#E2F163] to-[#d4e350]";
    return "from-neutral-600 to-neutral-700";
  };

  const getStateIcon = () => {
    if (isCompleted) return <Trophy className="w-6 h-6" />;
    if (isActive) return <Zap className="w-6 h-6" />;
    if (isLocked) return <Lock className="w-6 h-6" />;
    return <Target className="w-6 h-6" />;
  };

  const getTaskLabel = (task: string): string => {
    const labels: Record<string, string> = {
      weigh_in_today: "שקילה יומית",
      log_2_meals: "תיעוד 2 ארוחות",
      log_3_meals: "תיעוד 3 ארוחות",
      protein_min: "יעד חלבון",
      log_streak_7: "רצף 7 ימים",
      log_streak_14: "רצף 14 ימים"
    };
    return labels[task] || task;
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              transition={{ duration: 0.2 }}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring",
                damping: 25,
                stiffness: 300,
                mass: 0.8
              }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-b from-neutral-900 to-black rounded-t-3xl shadow-2xl max-h-[90vh]"
              dir="rtl"
            >
              {/* Handle bar */}
              <motion.div
                className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-neutral-600 rounded-full"
                whileHover={{ scaleX: 1.5 }}
                transition={{ type: "spring", stiffness: 300 }}
              />

              {/* Close button */}
              <motion.button
                onClick={onClose}
                className="absolute top-6 left-6 w-10 h-10 rounded-full bg-neutral-800/50 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1, backgroundColor: "rgba(38, 38, 38, 0.8)" }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>

              {/* Content */}
              <motion.div
                className="px-6 pt-12 pb-safe overflow-y-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {/* Header with icon and state */}
                <motion.div
                  className="flex items-center gap-4 mb-6"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <motion.div
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getStateColor()} flex items-center justify-center text-black shadow-lg`}
                    whileHover={{ scale: 1.05, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {getStateIcon()}
                  </motion.div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-black text-white">
                      {node.title}
                    </h2>
                    {node.description && (
                      <p className="text-sm text-neutral-400 mt-1">
                        {node.description}
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Points badge */}
                {node.points && node.points > 0 && (
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#E2F163]/20 to-[#d4e350]/10 border border-[#E2F163]/30 mb-6"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", bounce: 0.4 }}
                  >
                    <Trophy className="w-4 h-4 text-[#E2F163]" />
                    <span className="text-[#E2F163] font-bold">{node.points} נקודות</span>
                  </motion.div>
                )}

                {/* Progress bar for active nodes */}
                {isActive && checklist.length > 0 && (
                  <motion.div
                    className="mb-6"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-neutral-400">התקדמות</span>
                      <motion.span
                        className="text-sm font-bold text-[#E2F163]"
                        key={progress}
                        initial={{ scale: 1.5 }}
                        animate={{ scale: 1 }}
                      >
                        {Math.round(progress)}%
                      </motion.span>
                    </div>
                    <div className="h-3 bg-neutral-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#E2F163] to-[#d4e350] relative"
                      >
                        {/* Shimmer effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ["-100%", "200%"] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Checklist with stagger animation */}
                {checklist.length > 0 && !isLocked && (
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-sm font-bold text-neutral-400 mb-3">משימות</h3>
                    <div className="space-y-2">
                      {checklist.map((task: string, i: number) => {
                        const isTaskCompleted = completedTasks.includes(task);
                        return (
                          <motion.div
                            key={i}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.35 + i * 0.05 }}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                              isTaskCompleted
                                ? "bg-lime-400/10 border border-lime-400/30"
                                : "bg-neutral-800/50 border border-neutral-700/50"
                            }`}
                          >
                            <motion.div
                              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isTaskCompleted
                                  ? "bg-lime-400 text-black"
                                  : "bg-neutral-700 text-neutral-500"
                              }`}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.4 + i * 0.05, type: "spring", bounce: 0.5 }}
                            >
                              {isTaskCompleted ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <span className="text-xs">{i + 1}</span>
                              )}
                            </motion.div>
                            <span className={`text-sm ${
                              isTaskCompleted ? "text-lime-400" : "text-neutral-400"
                            }`}>
                              {getTaskLabel(task)}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Primary task info */}
                {node.primary_task && !isLocked && (
                  <motion.div
                    className="p-4 rounded-2xl bg-gradient-to-br from-neutral-800/50 to-neutral-900/30 border border-neutral-700/50 mb-6"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.45 }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-[#E2F163]" />
                      <span className="text-sm font-bold text-[#E2F163]">משימה ראשית</span>
                    </div>
                    <p className="text-white">{getTaskLabel(node.primary_task)}</p>
                  </motion.div>
                )}

                {/* Action button */}
                <div className="mb-6">
                  {getActionButton()}
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confetti effect */}
      <Confetti trigger={showConfetti} />
    </>
  );
}