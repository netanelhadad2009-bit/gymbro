import { useState, useEffect, useRef } from 'react';

/**
 * Configuration for time-based progress animation
 */
export type UseTimedProgressOptions = {
  /** Total duration to go from startAt to tailMaxBeforeDone (ms) */
  totalDurationMs?: number;
  /** Starting percentage */
  startAt?: number;
  /** Hold time at 100% before marking complete (ms) */
  finishHoldMs?: number;
  /** Max progress while backend is running (don't reach 100 until done) */
  tailMaxBeforeDone?: number;
  /** Progress increment per tick in tail mode (%) */
  tailStepPct?: number;
  /** Interval between tail ticks (ms) */
  tailIntervalMs?: number;
  /** Enable debug logging */
  debug?: boolean;
};

/**
 * Input state from backend
 */
export type UseTimedProgressInput = {
  /** Backend processing status */
  backendStatus: 'idle' | 'running' | 'done' | 'failed';
  /** Whether in soft-timeout state */
  softTimeout?: boolean;
};

/**
 * Time-based progress hook that moves at a constant rate regardless of backend speed
 *
 * Behavior:
 * - Animates linearly from startAt to tailMaxBeforeDone over totalDurationMs
 * - If backend finishes early, continues at same constant rate to 100 (no jump)
 * - If backend finishes late, enters tail mode with tiny constant steps until backend done
 * - Only sets isComplete after reaching 100% AND waiting finishHoldMs
 * - StrictMode-safe with proper cleanup
 */
export function useTimedProgress(
  input: UseTimedProgressInput,
  options: UseTimedProgressOptions = {}
): { uiProgress: number; isComplete: boolean } {
  const {
    totalDurationMs = 16000,
    startAt = 1,
    finishHoldMs = 800,
    tailMaxBeforeDone = 99,
    tailStepPct = 0.1,
    tailIntervalMs = 200,
    debug = false,
  } = options;

  const [uiProgress, setUiProgress] = useState(startAt);
  const [isComplete, setIsComplete] = useState(false);

  // Refs for animation state (survive StrictMode remounts)
  const startTimeRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const tailIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inTailModeRef = useRef(false);
  const completionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoggedTailRef = useRef(false);
  const hasLoggedDoneRef = useRef(false);
  const hasLoggedCompleteRef = useRef(false);

  // Calculate constant rate (percentage per ms)
  const constantRate = (tailMaxBeforeDone - startAt) / totalDurationMs;

  useEffect(() => {
    const { backendStatus } = input;

    // Don't animate if failed
    if (backendStatus === 'failed') {
      if (debug) console.log('[useTimedProgress] Backend failed, stopping animation');
      return;
    }

    // Don't start until running
    if (backendStatus === 'idle') {
      return;
    }

    // Initialize start time on first run
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      if (debug) {
        console.log('[useTimedProgress] Animation started', {
          totalDurationMs,
          startAt,
          tailMaxBeforeDone,
          constantRate: constantRate.toFixed(6),
        });
      }
    }

    const animate = () => {
      const now = Date.now();
      const elapsed = now - (startTimeRef.current || now);

      // Calculate linear progress based on elapsed time
      let newProgress = startAt + (elapsed * constantRate);

      if (backendStatus === 'done') {
        // Backend finished - continue at same constant rate to 100
        if (!hasLoggedDoneRef.current && newProgress < 100) {
          if (debug) {
            console.log('[useTimedProgress] Backend done; continuing at constant rate to 100', {
              currentProgress: newProgress.toFixed(2),
              rate: constantRate.toFixed(6),
            });
          }
          hasLoggedDoneRef.current = true;
        }

        // Continue at same rate until 100
        if (newProgress < 100) {
          setUiProgress(newProgress);
          rafIdRef.current = requestAnimationFrame(animate);
        } else {
          // Reached 100% - cap and trigger completion after hold
          setUiProgress(100);

          if (!hasLoggedCompleteRef.current) {
            if (debug) {
              console.log('[useTimedProgress] Reached 100%, holding before completion', {
                finishHoldMs,
                totalElapsed: elapsed,
              });
            }
            hasLoggedCompleteRef.current = true;
          }

          // Clear any existing completion timer
          if (completionTimerRef.current) {
            clearTimeout(completionTimerRef.current);
          }

          // Set completion after hold period
          completionTimerRef.current = setTimeout(() => {
            if (debug) console.log('[useTimedProgress] Hold complete, marking isComplete=true');
            setIsComplete(true);
          }, finishHoldMs);
        }
      } else {
        // Backend still running
        if (newProgress < tailMaxBeforeDone) {
          // Normal linear progression
          setUiProgress(newProgress);
          rafIdRef.current = requestAnimationFrame(animate);
        } else {
          // Reached tail max - enter tail mode
          if (!inTailModeRef.current) {
            inTailModeRef.current = true;
            setUiProgress(tailMaxBeforeDone);

            if (!hasLoggedTailRef.current) {
              if (debug) {
                console.log('[useTimedProgress] Entered tail mode (backend still running)', {
                  progress: tailMaxBeforeDone,
                  tailStepPct,
                  tailIntervalMs,
                });
              }
              hasLoggedTailRef.current = true;
            }

            // Start tail interval - tiny constant increments
            if (tailIntervalRef.current) {
              clearInterval(tailIntervalRef.current);
            }

            tailIntervalRef.current = setInterval(() => {
              setUiProgress((prev) => {
                const next = Math.min(prev + tailStepPct, 99.9); // Never reach 100 in tail
                return next;
              });
            }, tailIntervalMs);
          }
        }
      }
    };

    // Start animation loop if not in tail mode
    if (!inTailModeRef.current || backendStatus === 'done') {
      rafIdRef.current = requestAnimationFrame(animate);
    }

    // Cleanup
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (tailIntervalRef.current !== null) {
        clearInterval(tailIntervalRef.current);
        tailIntervalRef.current = null;
      }
      if (completionTimerRef.current !== null) {
        clearTimeout(completionTimerRef.current);
        completionTimerRef.current = null;
      }
    };
  }, [
    input.backendStatus,
    constantRate,
    startAt,
    tailMaxBeforeDone,
    tailStepPct,
    tailIntervalMs,
    finishHoldMs,
    debug,
  ]);

  return { uiProgress, isComplete };
}
