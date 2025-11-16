import { useEffect, useRef, useState, useCallback } from "react";

export type ConstantProgressOptions = {
  durationMs?: number;     // Total duration from startAt to endAt if backend never finishes
  startAt?: number;        // Initial progress value (default 1, never 0)
  endAt?: number;          // Maximum progress value (default 100)
  slowFinishFrom?: number; // Start easing at this percentage (default 92)
  minJitterPct?: number;   // Minimum jitter per frame (default 0)
  maxJitterPct?: number;   // Maximum jitter per frame (default 0)
  debug?: boolean;         // Enable console logging (default false)
};

/**
 * useConstantProgress
 *
 * A progress animation hook that moves continuously at a constant rate with
 * subtle end-phase easing for premium UX (Apple-style).
 *
 * Features:
 * - Uses requestAnimationFrame for smooth 60fps animation
 * - Never pauses or stops until force-completed
 * - Applies ease-out only in final stretch (92% → 100% by default)
 * - Supports force-complete to smoothly animate to 100%
 * - StrictMode-safe with proper RAF cleanup
 *
 * @param opts Configuration options
 * @returns { progress: number, forceComplete: (ms?) => void }
 *
 * @example
 * const { progress, forceComplete } = useConstantProgress({
 *   durationMs: 60000,  // 1 minute total if backend never finishes
 *   slowFinishFrom: 92, // Start easing at 92%
 *   debug: true,        // Enable logging
 * });
 *
 * // When backend finishes:
 * forceComplete(450); // Animate remaining progress to 100% over 450ms
 */
export function useConstantProgress(opts?: ConstantProgressOptions) {
  const {
    durationMs = 60000,
    startAt = 1,
    endAt = 100,
    slowFinishFrom = 92,
    minJitterPct = 0,
    maxJitterPct = 0,
    debug = false,
  } = opts || {};

  const [progress, setProgress] = useState(startAt);

  // Animation state refs
  const rafRef = useRef<number>();
  const startTimeRef = useRef<number>(performance.now());
  const progressRef = useRef<number>(startAt);

  // Force-complete state
  const isForceCompletingRef = useRef(false);
  const forceCompleteStartRef = useRef({ progress: startAt, time: 0 });
  const forceCompleteDurationRef = useRef(450);

  // Sync progress to ref for force-complete
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Main animation loop
  useEffect(() => {
    if (debug) {
      console.debug('[useConstantProgress] Animation started', {
        durationMs,
        startAt,
        endAt,
        slowFinishFrom,
      });
    }

    const animate = (currentTime: number) => {
      if (isForceCompletingRef.current) {
        // FORCE-COMPLETE MODE: Animate remaining progress to 100%
        const elapsed = currentTime - forceCompleteStartRef.current.time;
        const t = Math.min(elapsed / forceCompleteDurationRef.current, 1);

        if (t >= 1) {
          // Finished force-completing
          setProgress(endAt);
          if (debug) {
            console.debug('[useConstantProgress] Force-complete finished at 100%');
          }
          return; // Stop animation
        }

        // Ease remaining distance to 100%
        const startProgress = forceCompleteStartRef.current.progress;
        const remaining = endAt - startProgress;
        const eased = easeOut(t);
        const newProgress = startProgress + remaining * eased;

        setProgress(newProgress);

        if (debug) {
          console.debug('[useConstantProgress] Force-completing', {
            t: t.toFixed(3),
            progress: newProgress.toFixed(2),
          });
        }

        rafRef.current = requestAnimationFrame(animate);
      } else {
        // NORMAL MODE: Constant progression with end-phase easing
        const elapsed = currentTime - startTimeRef.current;
        const linearT = elapsed / durationMs;

        // Calculate linear progress
        let newProgress = startAt + linearT * (endAt - startAt);

        // IMPORTANT: Never reach 100% in normal mode (cap at 99.7%)
        // This ensures we never hit 100% until backend explicitly says "done"
        newProgress = Math.min(newProgress, endAt - 0.3);

        // Apply end-phase easing if in slow-finish zone
        if (newProgress >= slowFinishFrom) {
          // Map position within the finish zone (92% → 99.7%)
          const finishZoneStart = slowFinishFrom;
          const finishZoneEnd = endAt - 0.3; // Cap at 99.7%
          const finishRange = finishZoneEnd - finishZoneStart;

          // Position in finish zone (0.0 → 1.0)
          const positionInZone = (newProgress - finishZoneStart) / finishRange;

          // Apply ease-out to this segment only
          const eased = easeOut(positionInZone);
          newProgress = finishZoneStart + finishRange * eased;
        }

        // Add optional jitter for organic feel
        if (maxJitterPct > 0) {
          const jitter = minJitterPct + Math.random() * (maxJitterPct - minJitterPct);
          newProgress = Math.min(newProgress + jitter, endAt - 0.3);
        }

        setProgress(newProgress);

        if (debug && Math.floor(elapsed) % 1000 === 0) {
          // Log once per second to avoid spam
          console.debug('[useConstantProgress] Normal progression', {
            elapsed: (elapsed / 1000).toFixed(1) + 's',
            progress: newProgress.toFixed(2),
            inFinishZone: newProgress >= slowFinishFrom,
          });
        }

        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    // Cleanup RAF on unmount
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        if (debug) {
          console.debug('[useConstantProgress] RAF cleaned up');
        }
      }
    };
  }, [durationMs, startAt, endAt, slowFinishFrom, minJitterPct, maxJitterPct, debug]);

  /**
   * Force-complete the progress animation to 100%
   *
   * Smoothly animates remaining progress to exactly 100% over the specified duration.
   * After this completes, the animation stops.
   *
   * @param ms Duration in milliseconds (default 450ms)
   */
  const forceComplete = useCallback(
    (ms: number = 450) => {
      if (isForceCompletingRef.current) {
        if (debug) {
          console.warn('[useConstantProgress] forceComplete already in progress, ignoring');
        }
        return;
      }

      isForceCompletingRef.current = true;
      forceCompleteStartRef.current = {
        progress: progressRef.current,
        time: performance.now(),
      };
      forceCompleteDurationRef.current = ms;

      if (debug) {
        console.debug('[useConstantProgress] forceComplete called', {
          currentProgress: progressRef.current.toFixed(2),
          remaining: (endAt - progressRef.current).toFixed(2),
          duration: ms + 'ms',
        });
      }
    },
    [endAt, debug]
  );

  return { progress, forceComplete };
}

/**
 * Ease-out curve: 1 - (1-t)^2.5
 *
 * Creates a smooth deceleration effect where progress moves
 * quickly at first, then gradually slows as it approaches completion.
 *
 * @param t Input value (0.0 → 1.0)
 * @returns Eased value (0.0 → 1.0)
 */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 2.5);
}
