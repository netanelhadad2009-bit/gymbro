"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Stage, UserStage, UserMetrics } from "@/lib/stageEngine";
import { evaluateRequirements, getNextSteps } from "@/lib/stageEngine";
import { colors } from "@/lib/tokens";
import { he } from "@/lib/i18n/he";

interface StageSheetProps {
  stage: Stage | null;
  userStage: UserStage | null;
  metrics: UserMetrics;
  onClose: () => void;
  onStart?: () => void;
  onLogWorkout?: () => void;
  onLogMeal?: () => void;
}

export function StageSheet({
  stage,
  userStage,
  metrics,
  onClose,
  onStart,
  onLogWorkout,
  onLogMeal,
}: StageSheetProps) {
  if (!stage || !userStage) return null;

  const evaluation = evaluateRequirements(stage.requirements, metrics);
  const nextSteps = getNextSteps(stage, evaluation, metrics);
  const isLocked = userStage.status === "locked";
  const isAvailable = userStage.status === "available";
  const isInProgress = userStage.status === "in_progress";
  const isCompleted = userStage.status === "completed";

  // Progress percentage
  const progressPercent = Math.round(userStage.progress * 100);
  const xpProgress = userStage.xp_current / userStage.xp_total;
  const xpPercent = Math.round(xpProgress * 100);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-20 flex items-end justify-center sm:items-center"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md rounded-t-3xl sm:rounded-3xl"
          style={{ backgroundColor: colors.surface, maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
          dir="rtl"
        >
          {/* Scrollable content */}
          <div className="overflow-y-auto" style={{ maxHeight: "90vh" }}>
            {/* Header */}
            <div className="sticky top-0 z-10 border-b p-6" style={{
              backgroundColor: colors.surface,
              borderColor: colors.outline
            }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="text-4xl">{stage.icon}</span>
                    <div>
                      <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
                        {stage.title_he}
                      </h2>
                      <div className="mt-1 flex items-center gap-2">
                        <StatusBadge status={userStage.status} />
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          שלב {stage.order_index}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    {stage.summary_he}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg px-3 py-1.5 text-sm transition-colors hover:opacity-80"
                  style={{ backgroundColor: colors.surfaceElevated, color: colors.text }}
                  aria-label={he.stage.close}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Progress Section */}
            {(isInProgress || isCompleted) && (
              <div className="border-b p-6" style={{ borderColor: colors.outline }}>
                {/* XP Progress */}
                <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: colors.text }}>
                      {he.stage.xpLabel}
                    </span>
                    <span className="text-sm font-bold" style={{ color: colors.accent }}>
                      {userStage.xp_current} / {userStage.xp_total}
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.surfaceElevated }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: colors.accent }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-right" style={{ color: colors.textMuted }}>
                    {xpPercent}% הושלם
                  </p>
                </div>

                {/* Overall Progress Ring Visualization */}
                {isInProgress && (
                  <div className="flex items-center justify-center py-4">
                    <div className="relative">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        {/* Background circle */}
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke={colors.surfaceElevated}
                          strokeWidth="8"
                        />
                        {/* Progress arc */}
                        <motion.circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke={colors.warning}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={`${progressPercent * 3.39} 339`}
                          transform="rotate(-90 60 60)"
                          initial={{ strokeDasharray: "0 339" }}
                          animate={{ strokeDasharray: `${progressPercent * 3.39} 339` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold" style={{ color: colors.text }}>
                          {progressPercent}%
                        </span>
                        <span className="text-xs" style={{ color: colors.textMuted }}>
                          {he.stage.progress}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Requirements Checklist */}
            <div className="border-b p-6" style={{ borderColor: colors.outline }}>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide" style={{ color: colors.textMuted }}>
                {he.stage.requirementsLabel}
              </h3>
              <ul className="space-y-3">
                {stage.requirements.rules.map((rule, idx) => {
                  const isMet = evaluation.metRules.includes(rule);
                  const currentValue = metrics[rule.metric] || 0;
                  const targetValue = rule.gte || 0;

                  return (
                    <li key={idx} className="flex items-start gap-3">
                      <div
                        className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-xs"
                        style={{
                          backgroundColor: isMet ? colors.success : colors.surfaceElevated,
                          color: isMet ? colors.bg : colors.textMuted,
                        }}
                      >
                        {isMet ? "✓" : "○"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-medium" style={{ color: colors.text }}>
                            {he.requirements[rule.metric] || rule.metric}
                          </span>
                          <span className="text-xs" style={{ color: isMet ? colors.success : colors.textMuted }}>
                            {currentValue} / {targetValue}
                          </span>
                        </div>
                        {rule.window_days && (
                          <p className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
                            בחלון של {rule.window_days} {he.requirements.days}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Bonus unlock conditions */}
              {stage.requirements.unlock_any_of && stage.requirements.unlock_any_of.length > 0 && (
                <div className="mt-4 rounded-lg p-3" style={{ backgroundColor: colors.surfaceElevated }}>
                  <p className="text-xs font-semibold" style={{ color: colors.accent }}>
                    או השג אחד מאלה:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {stage.requirements.unlock_any_of.map((rule, idx) => (
                      <li key={idx} className="text-xs" style={{ color: colors.textMuted }}>
                        • {he.requirements[rule.metric]}: {rule.gte}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Next Steps (for in-progress stages) */}
            {isInProgress && nextSteps.length > 0 && (
              <div className="border-b p-6" style={{ borderColor: colors.outline }}>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide" style={{ color: colors.textMuted }}>
                  {he.stage.nextStepsLabel}
                </h3>
                <ul className="space-y-2">
                  {nextSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm" style={{ color: colors.text }}>
                      <span style={{ color: colors.accent }}>→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Locked State Message */}
            {isLocked && (
              <div className="p-6">
                <div className="rounded-lg p-4 text-center" style={{ backgroundColor: colors.surfaceElevated }}>
                  <div className="mb-2 text-2xl">🔒</div>
                  <p className="text-sm" style={{ color: colors.textMuted }}>
                    {he.hints.locked}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-6">
              <div className="flex flex-col gap-3">
                {isAvailable && onStart && (
                  <button
                    onClick={onStart}
                    className="w-full rounded-xl py-3.5 font-bold transition-transform active:scale-95"
                    style={{ backgroundColor: colors.accent, color: colors.bg }}
                  >
                    {he.stage.start}
                  </button>
                )}

                {isInProgress && (
                  <>
                    {onLogWorkout && (
                      <button
                        onClick={onLogWorkout}
                        className="w-full rounded-xl py-3 font-semibold transition-colors"
                        style={{
                          backgroundColor: colors.surfaceElevated,
                          color: colors.text,
                          border: `2px solid ${colors.outline}`,
                        }}
                      >
                        {he.stage.logWorkout}
                      </button>
                    )}
                    {onLogMeal && (
                      <button
                        onClick={onLogMeal}
                        className="w-full rounded-xl py-3 font-semibold transition-colors"
                        style={{
                          backgroundColor: colors.surfaceElevated,
                          color: colors.text,
                          border: `2px solid ${colors.outline}`,
                        }}
                      >
                        {he.stage.logMeal}
                      </button>
                    )}
                  </>
                )}

                {isCompleted && (
                  <div className="rounded-lg p-4 text-center" style={{ backgroundColor: colors.surfaceElevated }}>
                    <div className="mb-2 text-3xl">🎉</div>
                    <p className="font-bold" style={{ color: colors.success }}>
                      {he.stage.completed}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>
                      {he.stage.share}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    locked: { label: he.stage.locked, color: colors.textMuted },
    available: { label: he.stage.available, color: colors.accent },
    in_progress: { label: he.stage.inProgress, color: colors.warning },
    completed: { label: he.stage.completed, color: colors.success },
  };

  const { label, color } = config[status as keyof typeof config] || config.locked;

  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: `${color}20`,
        color,
      }}
    >
      {label}
    </span>
  );
}
