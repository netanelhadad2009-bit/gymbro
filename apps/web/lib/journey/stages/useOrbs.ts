/**
 * useOrbs - Orb-focused wrapper over useStages
 *
 * Provides UI-friendly orb data with:
 * - Computed positions (zigzag layout)
 * - State flags (LOCKED, ACTIVE, COMPLETED)
 * - Icon and accent color theming
 * - Effective progress calculation for protein & calorie missions
 */

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useStages, StageTask } from './useStages';
import { getTaskIcon } from '@/components/journey/icons';
import { getTaskEffectiveProgress, getTodaysCalories } from '../progress';
import { getUserNutritionTargets, UserNutritionTargets } from '../userTargets';

export type OrbState = 'LOCKED' | 'ACTIVE' | 'COMPLETED';

export interface OrbTask {
  // Core identity
  id: string;
  stageId: string;
  title: string;
  subtitle?: string;
  keyCode: string;

  // Progress
  points: number;
  progress: number; // 0..1
  current?: number;
  target?: number;

  // State
  state: OrbState;
  canComplete: boolean;
  lockedByStage: boolean; // Task is locked because parent stage is locked

  // Visual
  icon: ReturnType<typeof getTaskIcon>;
  accentHex: string;

  // Layout
  orderIndex: number;
  position: {
    xPercent: number; // -10, 0, +10 for zigzag
    yIndex: number;   // vertical index (0, 1, 2, ...)
  };

  // Original task for detail sheet
  originalTask: StageTask;
}

/**
 * Compute zigzag horizontal position based on order index
 */
function computeXPosition(index: number): number {
  const pattern = [0, 12, -12]; // center, right-offset, left-offset
  return pattern[index % 3];
}

/**
 * Determine orb state from task flags
 * Now considers lockedByStage flag from API
 */
function getOrbState(
  task: StageTask,
  isActiveStage: boolean
): OrbState {
  if (task.is_completed) return 'COMPLETED';
  if (task.lockedByStage) return 'LOCKED';
  if (!isActiveStage) return 'LOCKED';
  return 'ACTIVE';
}

export function useOrbs(accentColor: string = '#E2F163') {
  const {
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
  } = useStages();

  // Fetch user nutrition targets for effective progress calculation
  const [userTargets, setUserTargets] = useState<UserNutritionTargets | null>(null);
  const [todaysCalories, setTodaysCalories] = useState<number>(0);

  useEffect(() => {
    // Fetch user targets
    getUserNutritionTargets().then(targets => {
      setUserTargets(targets);
    });

    // Fetch today's calories
    getTodaysCalories().then(calories => {
      setTodaysCalories(calories);
    });
  }, [selectedStage]); // Refetch when stage changes

  // Transform selected stage tasks into orbs
  const orbs: OrbTask[] = useMemo(() => {
    if (!selectedStage) return [];

    const isActiveStage = selectedStageIndex === activeStageIndex;

    return selectedStage.tasks.map((task, index) => {
      const state = getOrbState(task, isActiveStage);

      // Calculate effective progress for protein & calorie missions
      const effectiveProgress = getTaskEffectiveProgress(task, {
        userTargets,
        todaysCalories,
      });

      // Debug log for protein and calorie missions
      const keyCode = task.key_code.toUpperCase();
      const conditionType = task.condition_json?.type;
      const isProteinMission = keyCode.includes('PROTEIN') || conditionType === 'HIT_PROTEIN_GOAL';
      const isCalorieMission =
        conditionType === 'WEEKLY_DEFICIT' ||
        conditionType === 'WEEKLY_SURPLUS' ||
        conditionType === 'WEEKLY_BALANCED';

      if (isProteinMission || isCalorieMission) {
        console.log('[OrbProgress] Effective progress calculated', {
          taskId: task.id,
          keyCode: task.key_code,
          conditionType,
          current: task.current,
          target: task.target,
          rawProgress: task.progress,
          effectiveProgress,
          userTargets,
          todaysCalories,
        });
      }

      return {
        // Core identity
        id: task.id,
        stageId: selectedStage.id,
        title: task.title_he,
        subtitle: task.desc_he,
        keyCode: task.key_code,

        // Progress - use effective progress
        points: task.points,
        progress: effectiveProgress,
        current: task.current,
        target: task.target,

        // State
        state,
        canComplete: task.canComplete ?? false,
        lockedByStage: task.lockedByStage,

        // Visual
        icon: getTaskIcon(task.key_code),
        accentHex: state === 'COMPLETED' ? '#10b981' : accentColor,

        // Layout
        orderIndex: index,
        position: {
          xPercent: computeXPosition(index),
          yIndex: index,
        },

        // Original task
        originalTask: task,
      };
    });
  }, [selectedStage, selectedStageIndex, activeStageIndex, accentColor, userTargets, todaysCalories]);

  // Find the first active or incomplete orb (for auto-scroll)
  const focusOrbIndex = useMemo(() => {
    return orbs.findIndex(orb => orb.state === 'ACTIVE');
  }, [orbs]);

  return {
    // Orb data
    orbs,
    focusOrbIndex,

    // Stage info
    selectedStage,
    selectedStageIndex,
    activeStageIndex,
    stages,

    // State
    isLoading,
    error,
    isCompleting,

    // Actions
    setSelectedStageIndex,
    completeTask,
    refetch,
  };
}
