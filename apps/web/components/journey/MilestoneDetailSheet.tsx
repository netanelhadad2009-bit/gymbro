/**
 * MilestoneDetailSheet - Bottom sheet for task details and completion
 *
 * Shows task details, completion steps, and action buttons
 * Handles inline completion or navigation to relevant screens
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Scale,
  UtensilsCrossed,
  TrendingUp,
  CalendarDays,
  Zap,
  Loader2,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerPortal,
  DrawerOverlay,
} from '@/components/ui/drawer';
import { hapticSuccess, hapticError } from '@/lib/haptics';
import { StageTask } from '@/lib/journey/stages/useStages';
import { Confetti } from '@/components/journey/Confetti';
import { getUserNutritionTargets, UserNutritionTargets } from '@/lib/journey/userTargets';
import {
  getTodaysCalories,
  computeProteinTarget,
  computeCaloriesTarget,
  getTaskEffectiveProgress,
} from '@/lib/journey/progress';

interface MilestoneDetailSheetProps {
  task: StageTask | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (taskId: string) => Promise<void>;
  avatarColor?: string;
  onGoToActiveStage?: () => void;
}

// Get icon for task type
function getTaskIcon(keyCode: string) {
  if (keyCode.includes('WEIGH')) return Scale;
  if (keyCode.includes('MEAL')) return UtensilsCrossed;
  if (keyCode.includes('PROTEIN')) return TrendingUp;
  if (keyCode.includes('STREAK')) return CalendarDays;
  return Zap;
}

// Get completion steps based on task type
// Now supports dynamic user targets for protein/calorie missions
function getCompletionSteps(task: StageTask, userTargets?: UserNutritionTargets | null): string[] {
  const keyCode = task.key_code.toUpperCase();
  const conditionType = task.condition_json?.type;
  const useUserTarget = task.condition_json?.use_user_target || false;

  if (keyCode.includes('FIRST_WEIGH')) {
    return [
      'פתח את מסך השקילה',
      'הוסף את המשקל הנוכחי שלך',
      'שמור את הנתונים',
    ];
  }

  if (keyCode.includes('LOG') && keyCode.includes('MEAL')) {
    const target = task.target || 3;
    const current = task.current || 0;
    return [
      `תעד לפחות ${target} ארוחות היום`,
      `נותרו ${Math.max(0, target - current)} ארוחות לתיעוד`,
      'הוסף תמונה או תיאור לכל ארוחה',
    ];
  }

  if (keyCode.includes('PROTEIN') || conditionType === 'HIT_PROTEIN_GOAL') {
    // Use strict target priority (always prefer userTargets.protein when available)
    const target = computeProteinTarget(task, userTargets);

    return [
      `השג יעד חלבון יומי של ${target} גרם`,
      'תעד את כל הארוחות שלך היום',
      'בדוק את סכום החלבון במסך התזונה',
    ];
  }

  if (keyCode.includes('STREAK')) {
    const target = task.condition_json?.target || 3;
    return [
      `המשך לתעד ארוחות ${target} ימים ברצף`,
      'תעד לפחות 3 ארוחות בכל יום',
      `נותרו ${Math.max(0, target - (task.current || 0))} ימים להשלמה`,
    ];
  }

  // Handle calorie-based missions with dynamic user targets
  // All calorie missions now use the user's daily calories from their plan
  // (which already includes deficit/surplus logic)
  if (conditionType === 'WEEKLY_DEFICIT' || conditionType === 'WEEKLY_SURPLUS' || conditionType === 'WEEKLY_BALANCED') {
    // Use the user's daily calorie target from their nutrition plan
    const calorieTarget = computeCaloriesTarget(task, userTargets);

    // Unified messaging: all calorie missions are about sticking to the plan
    // No need to expose "deficit", "surplus", or "maintenance" terminology
    return [
      `אכול לפי יעד הקלוריות היומי שלך (${calorieTarget} קלוריות)`,
      'תעד את כל הארוחות שלך במסך התזונה',
      'בדוק שהצריכה היומית שלך קרובה ליעד מהתפריט',
    ];
  }

  return ['השלם את המשימה לפי ההנחיות'];
}

// Determine if task can be completed inline
function canCompleteInline(keyCode: string): boolean {
  // For now, only weight and meal logging can be done inline
  return keyCode.includes('FIRST_WEIGH') || keyCode.includes('LOG_MEALS');
}

// Get deep link for task
function getTaskDeepLink(task: StageTask): string | null {
  const keyCode = task.key_code.toUpperCase();

  if (keyCode.includes('WEIGH')) {
    return '/progress?action=weigh';
  }

  if (keyCode.includes('MEAL')) {
    return '/nutrition';
  }

  if (keyCode.includes('PROTEIN')) {
    return '/nutrition';
  }

  return null;
}

/**
 * Helper function to determine if a task is fully completed based on frontend data
 * This handles over-achievement cases (e.g., 102g protein when target is 100g)
 * @param task - The task to check
 * @param options - Additional data needed for calculation
 * @returns true if task can be marked as completed
 */
function isTaskFullyCompleted(
  task: StageTask,
  options: {
    userTargets: UserNutritionTargets | null;
    todaysCalories: number;
  }
): boolean {
  const { userTargets, todaysCalories } = options;
  const current = task.current ?? 0;
  const target = task.target ?? 0;
  const progress = task.progress ?? 0;

  const keyCode = task.key_code?.toUpperCase() || '';
  const conditionType = task.condition_json?.type;
  const isProteinMission = keyCode.includes('PROTEIN') || conditionType === 'HIT_PROTEIN_GOAL';
  const isCalorieMission = conditionType === 'WEEKLY_DEFICIT' ||
                          conditionType === 'WEEKLY_SURPLUS' ||
                          conditionType === 'WEEKLY_BALANCED';

  // For protein missions: check if current >= computed target
  if (isProteinMission) {
    const proteinTarget = computeProteinTarget(task, userTargets);
    const isComplete = current >= proteinTarget;
    console.log('[isTaskFullyCompleted] PROTEIN CHECK', {
      taskId: task.id,
      current,
      proteinTarget,
      isComplete,
      rawTarget: target,
    });
    return isComplete;
  }

  // For weekly calorie missions: check if user has completed enough days
  // For these missions, current = successDays, target = required days (lookback)
  if (isCalorieMission) {
    // Weekly missions track days, not calories
    // The task is complete when successDays >= required days
    const isComplete = current >= target;
    console.log('[isTaskFullyCompleted] WEEKLY CALORIES CHECK', {
      taskId: task.id,
      conditionType,
      successDays: current,
      requiredDays: target,
      isComplete,
      todaysCalories,
      caloriesTarget: computeCaloriesTarget(task, userTargets),
    });
    return isComplete;
  }

  // For other missions: use progress percentage (allow >= 99.5% to handle floating point)
  // OR check if current >= target
  const progressIsComplete = (progress * 100) >= 99.5;
  const currentIsComplete = target > 0 && current >= target;
  const isComplete = progressIsComplete || currentIsComplete;

  console.log('[isTaskFullyCompleted] GENERAL CHECK', {
    taskId: task.id,
    current,
    target,
    progress,
    progressPercent: progress * 100,
    progressIsComplete,
    currentIsComplete,
    isComplete,
  });

  return isComplete;
}

export function MilestoneDetailSheet({
  task,
  open,
  onOpenChange,
  onComplete,
  avatarColor = '#E2F163',
  onGoToActiveStage,
}: MilestoneDetailSheetProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasCompletedInSession, setHasCompletedInSession] = useState(false);
  const [userTargets, setUserTargets] = useState<UserNutritionTargets | null>(null);
  const [todaysCalories, setTodaysCalories] = useState<number>(0);
  const router = useRouter();

  // Fetch user's nutrition targets and today's calories when sheet opens
  useEffect(() => {
    if (open && task) {
      getUserNutritionTargets().then(targets => {
        setUserTargets(targets);
      }).catch(err => {
        console.error('[MilestoneDetailSheet] Failed to fetch user targets:', err);
      });

      getTodaysCalories().then(calories => {
        setTodaysCalories(calories);
      }).catch(err => {
        console.error('[MilestoneDetailSheet] Failed to fetch today\'s calories:', err);
      });
    }
  }, [open, task]);

  // DEBUG: Log runtime values for protein missions
  useEffect(() => {
    if (task && (task.key_code?.toUpperCase().includes('PROTEIN') || task.condition_json?.type === 'HIT_PROTEIN_GOAL')) {
      console.log('[MilestoneSheet] PROTEIN MISSION DEBUG', {
        taskId: task.id,
        keyCode: task.key_code,
        conditionType: task.condition_json?.type,
        useUserTarget: task.condition_json?.use_user_target,
        conditionTarget: task.condition_json?.target,
        taskTarget: task.target,
        taskCurrent: task.current,
        userTargets: userTargets,
        userTargetsProtein: userTargets?.protein,
      });
    }
  }, [task, userTargets]);

  // DEBUG: Log runtime values for calorie missions
  useEffect(() => {
    if (task && (task.condition_json?.type === 'WEEKLY_DEFICIT' ||
                 task.condition_json?.type === 'WEEKLY_SURPLUS' ||
                 task.condition_json?.type === 'WEEKLY_BALANCED')) {
      console.log('[MilestoneSheet] CALORIE MISSION DEBUG', {
        taskId: task.id,
        keyCode: task.key_code,
        conditionType: task.condition_json?.type,
        useUserTarget: task.condition_json?.use_user_target,
        conditionTarget: task.condition_json?.target,
        taskTarget: task.target,
        taskCurrent: task.current,
        userTargets: userTargets,
        userTargetsCalories: userTargets?.calories,
        userTargetsTdee: userTargets?.tdee,
      });
    }
  }, [task, userTargets]);

  if (!task) return null;

  const TaskIcon = getTaskIcon(task.key_code);
  const completionSteps = getCompletionSteps(task, userTargets);
  const deepLink = getTaskDeepLink(task);
  const canInlineComplete = canCompleteInline(task.key_code);
  const isCompleted = task.is_completed || hasCompletedInSession;
  const isLockedByStage = task.lockedByStage || false;

  // Compute correct display target for progress line
  const keyCode = task.key_code.toUpperCase();
  const conditionType = task.condition_json?.type;
  const isProteinMission = keyCode.includes('PROTEIN') || conditionType === 'HIT_PROTEIN_GOAL';
  const isCalorieMission = conditionType === 'WEEKLY_DEFICIT' ||
                          conditionType === 'WEEKLY_SURPLUS' ||
                          conditionType === 'WEEKLY_BALANCED';

  let displayTarget = task.target;
  if (isProteinMission) {
    displayTarget = computeProteinTarget(task, userTargets);
  } else if (isCalorieMission) {
    displayTarget = computeCaloriesTarget(task, userTargets);
  }

  // Weekly progress and days tracking for weekly calorie missions
  const isWeeklyCalorieMission = isCalorieMission; // alias for readability
  const weeklyProgress = isWeeklyCalorieMission ? (task.progress ?? 0) : (task.progress ?? 0);

  // For weekly missions: backend returns current=successDays, target=lookback
  // For other missions: current=value consumed, target=goal value
  let weeklyCurrentDays = isWeeklyCalorieMission && typeof task.current === 'number'
    ? task.current
    : Math.round(weeklyProgress * 7);
  let weeklyTargetDays = isWeeklyCalorieMission && typeof task.target === 'number'
    ? task.target
    : 7;

  // Safety guard: ensure we never show "0 מתוך 0 ימים"
  if (weeklyTargetDays <= 0) {
    weeklyTargetDays = 7;
  }
  // Clamp current days to valid range
  weeklyCurrentDays = Math.max(0, Math.min(weeklyCurrentDays, weeklyTargetDays));

  // Debug log for weekly days calculation
  if (isWeeklyCalorieMission) {
    console.log('[MilestoneSheet] WEEKLY DAYS DEBUG', {
      taskId: task.id,
      keyCode: task.key_code,
      rawCurrent: task.current,
      rawTarget: task.target,
      weeklyCurrentDays,
      weeklyTargetDays,
      weeklyProgress,
      conditionType,
    });
  }

  // Daily progress: For protein missions, use current/target
  // For weekly calorie missions, use todaysCalories fetched separately
  let dailyProgress = task.progress ?? 0;
  if (isProteinMission && displayTarget && displayTarget > 0) {
    // For protein: task.current is today's protein grams
    const current = typeof task.current === 'number' ? task.current : 0;
    dailyProgress = Math.min(1, Math.max(0, current / displayTarget));
  } else if (isWeeklyCalorieMission && displayTarget && displayTarget > 0) {
    // For weekly calorie missions: use fetched todaysCalories
    dailyProgress = Math.min(1, Math.max(0, todaysCalories / displayTarget));
  }

  // DEBUG: Log progress calculation
  console.log('[MilestoneSheet] PROGRESS', {
    taskId: task.id,
    keyCode: task.key_code,
    isProteinMission,
    isCalorieMission,
    isWeeklyCalorieMission,
    taskCurrent: task.current,
    taskTarget: task.target,
    todaysCalories,
    displayTarget,
    dailyProgress,
    weeklyProgress,
    weeklyCurrentDays,
    weeklyTargetDays,
    taskProgress: task.progress,
    conditionType,
  });

  const handleComplete = async () => {
    if (isCompleted || isCompleting) return;

    setIsCompleting(true);
    try {
      await onComplete(task.id);
      hapticSuccess();
      setShowConfetti(true);
      setHasCompletedInSession(true);

      // Close sheet after celebration
      setTimeout(() => {
        onOpenChange(false);
        setTimeout(() => {
          setShowConfetti(false);
          setHasCompletedInSession(false);
        }, 500);
      }, 2000);
    } catch (error) {
      console.error('Failed to complete task:', error);
      hapticError();
      alert('שגיאה בסיום המשימה. נסה שוב.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNavigate = () => {
    if (deepLink) {
      onOpenChange(false);
      router.push(deepLink);
    }
  };

  // Use shared helper to calculate effective progress
  const headerProgress = getTaskEffectiveProgress(task, {
    userTargets,
    todaysCalories,
  });

  // DEBUG: Log header progress calculation
  console.log('[MilestoneSheet] HEADER PROGRESS DEBUG', {
    isProteinMission,
    isWeeklyCalorieMission,
    isCalorieMission,
    todaysCalories,
    taskCurrent: task.current,
    proteinTarget: isProteinMission ? computeProteinTarget(task, userTargets) : undefined,
    caloriesTarget: isCalorieMission ? computeCaloriesTarget(task, userTargets) : undefined,
    weeklyCurrentDays,
    weeklyTargetDays,
    taskProgress: task.progress,
    headerProgress,
  });

  // For display: header uses headerProgress, bars use their respective progress values
  const progressPercent = Math.round(headerProgress * 100);
  const dailyProgressPercent = Math.round(dailyProgress * 100);

  return (
    <>
      {showConfetti && <Confetti trigger={showConfetti} />}
      <Drawer open={open} onOpenChange={onOpenChange}>
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DrawerTitle className="text-xl font-bold text-white mb-2 flex items-center gap-3">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${isCompleted ? 'bg-emerald-500/20' : 'bg-zinc-800'}
                      `}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <TaskIcon
                          className="w-5 h-5"
                          style={{ color: avatarColor }}
                        />
                      )}
                    </div>
                    {task.title_he}
                  </DrawerTitle>

                  {task.desc_he && (
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {task.desc_he}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Points badge */}
                  <div className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700">
                    <span className="text-sm font-bold text-lime-400">
                      {task.points} נק׳
                    </span>
                  </div>

                  {/* Progress chip */}
                  {!isCompleted && (
                    <div className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700">
                      <span className="text-sm font-semibold text-zinc-300">
                        {progressPercent}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {!isCompleted && (
                <div className="mt-4 space-y-3">
                  {/* Daily progress bar (for protein & calorie missions) */}
                  <div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#E2F163]"
                        initial={{ width: 0 }}
                        animate={{ width: `${dailyProgressPercent}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                    {displayTarget !== undefined && (
                      <p className="text-xs text-zinc-500 mt-1 text-center">
                        {isWeeklyCalorieMission ? todaysCalories : (task.current || 0)} מתוך {displayTarget}
                      </p>
                    )}
                  </div>

                  {/* Weekly progress bar (only for weekly calorie missions) */}
                  {isWeeklyCalorieMission && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-zinc-500">
                        <span>התקדמות השבוע</span>
                        <span>
                          {weeklyCurrentDays} מתוך {weeklyTargetDays} ימים
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-zinc-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DrawerHeader>

            <div className="p-5 space-y-6 overflow-y-auto flex-1">
              {/* Locked status */}
              {isLockedByStage && !isCompleted ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <X className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">המשימה נעולה</h3>
                  <p className="text-zinc-400 mb-4">
                    עליך להשלים את השלב הקודם כדי לפתוח משימה זו
                  </p>
                  <div className="px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                    <p className="text-sm text-zinc-300">
                      💡 השלם משימות בשלב הנוכחי כדי לפתוח שלבים חדשים
                    </p>
                  </div>
                </motion.div>
              ) : isCompleted ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8"
                >
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">משימה הושלמה!</h3>
                  <p className="text-zinc-400">
                    כל הכבוד! קיבלת {task.points} נקודות
                  </p>
                </motion.div>
              ) : (
                <div className="border-t border-zinc-800/80 pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-zinc-400 mb-4">
                    איך להשלים את המשימה:
                  </h3>
                  <div className="space-y-3">
                    {completionSteps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: `${avatarColor}20` }}
                        >
                          <span className="text-xs font-bold" style={{ color: avatarColor }}>
                            {index + 1}
                          </span>
                        </div>
                        <span className="text-sm text-zinc-300 leading-relaxed">
                          {step}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips section */}
              {!isCompleted && task.key_code.includes('PROTEIN') && (
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                  <p className="text-xs text-zinc-400 mb-1">💡 טיפ</p>
                  <p className="text-sm text-zinc-300">
                    הוסף חזה עוף, ביצים או טופו לארוחות שלך כדי להגיע ליעד החלבון
                  </p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!isCompleted && (
              <div className="p-5 border-t border-zinc-800/80 space-y-3">
                {(() => {
                  // Calculate if task can be completed based on frontend data
                  const frontendCanComplete = isTaskFullyCompleted(task, {
                    userTargets,
                    todaysCalories,
                  });

                  // Combined completion check: backend OR frontend
                  const canCompleteTask = task.canComplete || frontendCanComplete;

                  // Render locked buttons
                  if (isLockedByStage) {
                    return (
                      <>
                        <button
                          disabled
                          className="w-full h-12 rounded-2xl font-semibold bg-zinc-800 text-zinc-500 cursor-not-allowed"
                        >
                          נעול - השלם את השלב הקודם
                        </button>
                        {onGoToActiveStage && (
                          <button
                            onClick={() => {
                              onGoToActiveStage();
                              onOpenChange(false);
                            }}
                            className="w-full h-12 rounded-2xl font-semibold text-black active:scale-[0.98] transition-transform"
                            style={{ backgroundColor: avatarColor }}
                          >
                            עבור לשלב הנוכחי
                          </button>
                        )}
                        <button
                          onClick={() => onOpenChange(false)}
                          className="w-full h-10 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                        >
                          סגור
                        </button>
                      </>
                    );
                  }

                  // Render completion button if task is completable (PRIORITY!)
                  if (canCompleteTask) {
                    // Calculate effective target and current for protein missions
                    const keyCode = task.key_code?.toUpperCase() || '';
                    const conditionType = task.condition_json?.type;
                    const isProteinMission = keyCode.includes('PROTEIN') || conditionType === 'HIT_PROTEIN_GOAL';

                    const effectiveTarget = isProteinMission
                      ? computeProteinTarget(task, userTargets)
                      : displayTarget;
                    const effectiveCurrent = task.current ?? 0;

                    // DEBUG: Enhanced logging for protein missions
                    if (isProteinMission) {
                      console.log('[ProteinMission DEBUG]', {
                        id: task.id,
                        keyCode: task.key_code,
                        conditionType: task.condition_json?.type,
                        taskTarget: task.target,
                        taskCurrent: task.current,
                        taskProgress: task.progress,
                        effectiveTarget,      // from computeProteinTarget
                        effectiveCurrent,     // what we use for completion
                        frontendCanComplete,
                        backendCanComplete: task.canComplete,
                        canCompleteTask,
                        userTargets,
                        progressPercent,
                        dailyProgressPercent,
                      });
                    }

                    // DEBUG: General completion button state
                    console.log('[MilestoneDetailSheet] COMPLETION BUTTON DEBUG', {
                      taskId: task.id,
                      keyCode: task.key_code,
                      conditionType,
                      backendCanComplete: task.canComplete,
                      frontendCanComplete,
                      finalCanComplete: canCompleteTask,
                      taskCurrent: task.current,
                      taskTarget: task.target,
                      taskProgress: task.progress,
                      progressPercent,
                      dailyProgressPercent,
                      displayTarget,
                      todaysCalories,
                      userTargets,
                    });

                    return (
                      <>
                        <button
                          onClick={handleComplete}
                          disabled={isCompleting}
                          className="w-full h-12 rounded-2xl font-semibold transition-transform text-black active:scale-[0.98]"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {isCompleting ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              משלים...
                            </span>
                          ) : (
                            'סמן הושלם'
                          )}
                        </button>
                        <button
                          onClick={() => onOpenChange(false)}
                          className="w-full h-10 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                        >
                          לא עכשיו
                        </button>
                      </>
                    );
                  }

                  // Render navigation button if has deep link
                  if (deepLink && !canInlineComplete) {
                    return (
                      <>
                        <button
                          onClick={handleNavigate}
                          className="w-full h-12 rounded-2xl font-semibold text-black active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                          style={{ backgroundColor: avatarColor }}
                        >
                          עבור למסך
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onOpenChange(false)}
                          className="w-full h-10 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
                        >
                          לא עכשיו
                        </button>
                      </>
                    );
                  }

                  // Fallback: no action available
                  return null;
                })()}
              </div>
            )}
          </motion.div>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    </>
  );
}
