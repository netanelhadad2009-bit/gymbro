/**
 * Journey Client Hooks
 *
 * React hooks for journey state management, realtime updates, and actions.
 */

import { useState, useEffect, useReducer, useCallback, useRef } from "react";
import { fetchJourney, trackTask as apiTrackTask, completeNode as apiCompleteNode } from "./queries";
import { subscribeUserProgress, cleanup as cleanupRealtime } from "./realtime";
import type { JourneyData, JourneyResponse } from "./queries";
import * as storage from "@/lib/storage";

// Journey state
interface JourneyState {
  data: JourneyData | null;
  loading: boolean;
  error: string | null;
}

type JourneyAction =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: JourneyData }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "MERGE_PROGRESS"; nodeId: string; state: string; progressJson: any };

function journeyReducer(state: JourneyState, action: JourneyAction): JourneyState {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };

    case "FETCH_SUCCESS":
      return { data: action.payload, loading: false, error: null };

    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error };

    case "MERGE_PROGRESS":
      if (!state.data) return state;

      // Update node progress in place
      const updatedChapters = state.data.chapters.map(chapter => ({
        ...chapter,
        nodes: chapter.nodes.map(node =>
          node.id === action.nodeId
            ? {
                ...node,
                progress: {
                  ...node.progress,
                  state: action.state as any,
                  progress_json: action.progressJson,
                  updated_at: new Date().toISOString()
                }
              }
            : node
        )
      }));

      return {
        ...state,
        data: {
          ...state.data,
          chapters: updatedChapters
        }
      };

    default:
      return state;
  }
}

/**
 * Hook: useJourney
 *
 * Manages journey data, loading state, and realtime updates.
 */
export function useJourney() {
  const [state, dispatch] = useReducer(journeyReducer, {
    data: null,
    loading: true,
    error: null
  });

  const channelRef = useRef<any>(null);

  const fetchData = useCallback(async () => {
    console.log("[JourneyClient] Fetching journey data...");
    dispatch({ type: "FETCH_START" });

    const result = await fetchJourney();

    if (result.ok && result.data) {
      console.log("[JourneyClient] Fetch success:", {
        chapters: result.data.chapters.length,
        totalPoints: result.data.total_points
      });
      dispatch({ type: "FETCH_SUCCESS", payload: result.data });
    } else {
      console.error("[JourneyClient] Fetch error:", result.error);
      dispatch({ type: "FETCH_ERROR", error: result.message || "Unknown error" });
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Setup realtime subscription
  useEffect(() => {
    const setupRealtime = async () => {
      const userId = await storage.getCurrentUserId();
      if (!userId) return;

      console.log("[JourneyClient] Setting up realtime for user:", userId.substring(0, 8));

      channelRef.current = subscribeUserProgress(userId, (payload) => {
        console.log("[JourneyClient] Realtime update:", {
          nodeId: payload.node_id.substring(0, 8),
          state: payload.state
        });

        // Merge progress update
        dispatch({
          type: "MERGE_PROGRESS",
          nodeId: payload.node_id,
          state: payload.state,
          progressJson: payload.progress_json
        });
      });
    };

    if (state.data) {
      setupRealtime();
    }

    return () => {
      if (channelRef.current) {
        console.log("[JourneyClient] Cleaning up realtime subscription");
        cleanupRealtime(channelRef.current);
      }
    };
  }, [state.data]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: fetchData
  };
}

/**
 * Hook: useNodeActions
 *
 * Provides functions for tracking tasks and completing nodes.
 */
export function useNodeActions() {
  const [processing, setProcessing] = useState(false);

  const trackTask = useCallback(async (
    task_key: string,
    value?: any,
    node_id?: string
  ) => {
    console.log("[JourneyClient] Track task:", { task_key, node_id: node_id?.substring(0, 8) });
    setProcessing(true);

    try {
      const result = await apiTrackTask(task_key, value, node_id);
      console.log("[JourneyClient] Track result:", {
        ok: result.ok,
        canComplete: result.can_complete
      });
      return result;
    } finally {
      setProcessing(false);
    }
  }, []);

  const completeNode = useCallback(async (node_id: string) => {
    console.log("[JourneyClient] Complete node:", node_id.substring(0, 8));
    setProcessing(true);

    try {
      const result = await apiCompleteNode(node_id);

      if (result.ok) {
        console.log("[JourneyClient] Node completed:", {
          points: result.points_awarded,
          nextNode: result.next_node_id?.substring(0, 8)
        });

        // Trigger confetti/haptic if available
        if (typeof window !== "undefined") {
          // Haptic feedback
          if (navigator.vibrate) {
            navigator.vibrate([50, 100, 50]);
          }

          // Could trigger confetti here (would need confetti library)
          console.log("[JourneyClient] 🎉 Success animation!");
        }
      } else {
        console.warn("[JourneyClient] Complete failed:", result.error);
      }

      return result;
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    trackTask,
    completeNode,
    processing
  };
}
