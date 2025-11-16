/**
 * Simple event bus for UI-level events
 * Used to communicate between components without prop drilling
 */

type BusEvent = 'open-stage-picker';
type Handler = () => void;

const listeners = new Map<BusEvent, Set<Handler>>();

export const uiBus = {
  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on(event: BusEvent, handler: Handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event)!.add(handler);

    // Return cleanup function
    return () => {
      listeners.get(event)?.delete(handler);
    };
  },

  /**
   * Emit an event to all subscribers
   */
  emit(event: BusEvent) {
    listeners.get(event)?.forEach(h => h());
  },
};
