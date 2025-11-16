import { useEffect, useRef, useState } from "react";

type Options = {
  intervalMs?: number;
  minStep?: number;
  factor?: number;
  debug?: boolean;
};

/**
 * useSmoothProgress
 *
 * Smoothly animates progress from current value to target using ease-out pattern.
 *
 * @param target - The real progress value (0-100)
 * @param opts - Configuration options
 * @returns Smoothly animated progress value (float)
 *
 * @example
 * const smoothProgress = useSmoothProgress(sessionProgress, {
 *   intervalMs: 16,  // 60fps
 *   minStep: 0.4,    // minimum increment per frame
 *   factor: 0.08,    // ease-out factor (higher = faster approach)
 *   debug: true,     // enable console logs
 * });
 */
export function useSmoothProgress(target: number, opts: Options = {}) {
  const {
    intervalMs = 16,
    minStep = 0.4,
    factor = 0.08,
    debug = false,
  } = opts;

  const targetRef = useRef<number>(target);
  const [value, setValue] = useState<number>(() => {
    // Initialize to target, clamped to [1, 100]
    const init = Math.max(1, Math.min(target, 100));
    if (debug) console.debug("[useSmoothProgress] init:", init);
    return init;
  });

  // Update target ref when target changes
  useEffect(() => {
    targetRef.current = Math.max(1, Math.min(target, 100));
    if (debug) console.debug("[useSmoothProgress] target →", targetRef.current);
  }, [target, debug]);

  // Smooth animation loop
  useEffect(() => {
    const id = setInterval(() => {
      setValue(prev => {
        const diff = targetRef.current - prev;

        // Stop if we've reached the target (within epsilon)
        if (Math.abs(diff) <= 0.001) {
          return targetRef.current;
        }

        // Calculate step size using ease-out: larger steps when far, smaller when close
        const step = Math.max(minStep, Math.abs(diff) * factor);

        // Move towards target
        const next = diff > 0
          ? Math.min(prev + step, targetRef.current)  // Approaching from below
          : Math.max(prev - step, targetRef.current); // Approaching from above

        if (debug) {
          console.debug("[useSmoothProgress] smooth:", {
            from: prev.toFixed(2),
            to: next.toFixed(2),
            target: targetRef.current,
            step: step.toFixed(2)
          });
        }

        return next;
      });
    }, intervalMs);

    return () => {
      clearInterval(id);
      if (debug) console.debug("[useSmoothProgress] cleanup interval");
    };
  }, [intervalMs, minStep, factor, debug]);

  return value;
}
