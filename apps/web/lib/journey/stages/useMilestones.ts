/**
 * useMilestones - React hook wrapper for milestone-focused journey
 *
 * Provides simplified interface for milestone cards
 * Built on top of useStages with optimistic updates
 */

'use client';

import { useCallback } from 'react';
import { useStages, Stage, StageTask } from './useStages';

export interface Milestone extends StageTask {
  stageId: string;
  stageTitle: string;
  isActive: boolean;
  isLocked: boolean;
}

export function useMilestones() {
  const {
    stages,
    activeStageIndex,
    selectedStageIndex,
    selectedStage,
    isLoading,
    error,
    isCompleting,
    completeTask,
    refetch,
  } = useStages();

  // Flatten all tasks into milestones with stage context
  const milestones: Milestone[] = stages.flatMap((stage: Stage) => {
    const isActiveStage = stages.indexOf(stage) === activeStageIndex;
    const isLockedStage = !stage.is_unlocked && !stage.is_completed;

    return stage.tasks.map((task: StageTask) => ({
      ...task,
      stageId: stage.id,
      stageTitle: stage.title_he,
      isActive: isActiveStage && !task.is_completed,
      isLocked: isLockedStage || (!isActiveStage && !task.is_completed),
    }));
  });

  // Get current stage for context
  const currentStage = activeStageIndex !== null ? stages[activeStageIndex] : null;

  // Get active milestones (from active stage only)
  const activeMilestones = milestones.filter(m => m.isActive);

  // Complete a milestone task
  const completeMilestone = useCallback(async (taskId: string) => {
    const milestone = milestones.find(m => m.id === taskId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    const result = await completeTask(milestone.stageId, taskId);

    if (!result.ok) {
      throw new Error(result.message || result.error || 'Failed to complete milestone');
    }

    // Refetch will be called automatically by completeTask
    return result;
  }, [milestones, completeTask]);

  // Invalidate and refetch all data
  const invalidate = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    // All milestones across all stages
    milestones,

    // Active milestones only (current stage)
    activeMilestones,

    // Current stage info
    currentStage,
    currentStageIndex: activeStageIndex,

    // All stages for reference
    stages,

    // Loading and error states
    isLoading,
    error,
    isCompleting,

    // Actions
    completeMilestone,
    invalidate,
    refetch,
  };
}