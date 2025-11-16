import { useLayoutEffect } from 'react';

/**
 * Measures the Coach header height once on mount and locks it as a CSS variable
 * to prevent layout shifts when content loads.
 *
 * The offset is stored as --coach-top-offset on the #coach-root element.
 */
export function useCoachHeaderOffset() {
  useLayoutEffect(() => {
    const root = document.getElementById('coach-root');
    const header = document.getElementById('coach-header');

    if (!root || !header) return;

    // Measure header height immediately
    const measureAndSet = () => {
      const headerHeight = header.getBoundingClientRect().height;
      const offset = headerHeight + 4; // +4px minimal breathing room
      root.style.setProperty('--coach-top-offset', `${offset}px`);
    };

    // Set immediately on mount
    measureAndSet();

    // Observe header size changes (defensive, in case fonts load late)
    let timeoutId: NodeJS.Timeout;
    const ro = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      // Debounce to avoid too many updates
      timeoutId = setTimeout(measureAndSet, 100);
    });

    ro.observe(header);

    return () => {
      ro.disconnect();
      clearTimeout(timeoutId);
    };
  }, []);
}
