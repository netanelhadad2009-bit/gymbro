/**
 * useStages - React hook for managing user stages
 *
 * Fetches stages, handles task completion, and refetches on updates
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface StageTask {
  id: string;
  user_stage_id: string;
  order_index: number;
  key_code: string;
  title_he: string;
  desc_he?: string;
  points: number;
  condition_json: any;
  is_completed: boolean;
  progress: number; // 0..1
  canComplete: boolean;
  current?: number;
  target?: number;
  details?: string;
  lockedByStage: boolean; // Task is locked because parent stage is locked
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  user_id: string;
  stage_index: number;
  code: string;
  title_he: string;
  subtitle_he?: string;
  color_hex: string;
  is_unlocked: boolean;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
  tasks: StageTask[];
}

export interface StagesResponse {
  ok: boolean;
  stages: Stage[];
  activeStageIndex: number | null;
  unlockedUpToIndex: number; // Highest completed stage index
  message?: string;
}

export interface CompleteResponse {
  ok: boolean;
  pointsAwarded?: number;
  unlockedNext?: boolean;
  stageCompleted?: boolean;
  message?: string;
  error?: string;
}

export function useStages() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [activeStageIndex, setActiveStageIndex] = useState<number | null>(null);
  const [unlockedUpToIndex, setUnlockedUpToIndex] = useState<number>(-1);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState<string | null>(null); // task ID being completed

  // Fetch stages
  const fetchStages = useCallback(async (silent = false) => {
    try {
      // Only show loading state for initial load, not background refetches
      if (!silent) {
        setIsLoading(true);
      }
      setError(null);

      const response = await fetch('/api/journey/stages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stages: ${response.statusText}`);
      }

      const data: StagesResponse = await response.json();

      if (!data.ok) {
        throw new Error(data.message || 'Failed to fetch stages');
      }

      setStages(data.stages);
      setActiveStageIndex(data.activeStageIndex);
      setUnlockedUpToIndex(data.unlockedUpToIndex);

      // Set selected stage to active stage if available (only on initial load)
      if (data.activeStageIndex !== null && !silent) {
        setSelectedStageIndex(data.activeStageIndex);
      }
    } catch (err: any) {
      console.error('[useStages] Error fetching stages:', err);
      setError(err.message || 'Failed to fetch stages');
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  }, []);

  // Complete task
  const completeTask = useCallback(async (
    stageId: string,
    taskId: string
  ): Promise<CompleteResponse> => {
    try {
      setIsCompleting(taskId);

      const response = await fetch('/api/journey/stages/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stageId, taskId }),
      });

      const data: CompleteResponse = await response.json();

      if (!data.ok) {
        console.error('[useStages] Complete error:', data.error);
        return data;
      }

      // Refetch stages to get updated state (silent mode to avoid loading screen)
      await fetchStages(true);

      return data;
    } catch (err: any) {
      console.error('[useStages] Error completing task:', err);
      return {
        ok: false,
        error: err.message || 'Failed to complete task',
      };
    } finally {
      setIsCompleting(null);
    }
  }, [fetchStages]);

  // Initial fetch
  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  // Get currently selected stage
  const selectedStage = stages[selectedStageIndex] || null;

  return {
    stages,
    activeStageIndex,
    unlockedUpToIndex,
    selectedStageIndex,
    selectedStage,
    isLoading,
    error,
    isCompleting,
    setSelectedStageIndex,
    completeTask,
    refetch: fetchStages,
  };
}
