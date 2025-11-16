/**
 * Haptic feedback utilities for mobile devices
 * Provides safe, cross-browser vibration patterns
 */

/**
 * Trigger a short haptic vibration
 * Safe no-op on browsers without support
 * @param duration - Vibration duration in milliseconds (default: 20)
 */
export function haptic(duration: number = 20) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(duration);
    } catch (e) {
      // Silently fail - not all browsers support vibration
    }
  }
}

/**
 * Trigger a success haptic pattern
 * Uses a double-tap pattern for completion feedback
 */
export function hapticSuccess() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([30, 50, 30]);
    } catch (e) {
      // Silently fail
    }
  }
}

/**
 * Trigger an error haptic pattern
 * Uses a longer vibration for error feedback
 */
export function hapticError() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(100);
    } catch (e) {
      // Silently fail
    }
  }
}

/**
 * Trigger a selection haptic
 * Very light tap for UI selections
 */
export function hapticSelect() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(10);
    } catch (e) {
      // Silently fail
    }
  }
}