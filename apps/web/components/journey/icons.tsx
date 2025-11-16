/**
 * Task Type Icons
 * Maps task key codes to their corresponding Lucide icons
 */

import {
  Scale,
  UtensilsCrossed,
  TrendingUp,
  CalendarDays,
  Zap,
} from 'lucide-react';

export type TaskIcon = typeof Scale;

/**
 * Get the appropriate icon for a task based on its key code
 */
export function getTaskIcon(keyCode: string): TaskIcon {
  const code = keyCode.toUpperCase();

  if (code.includes('WEIGH')) return Scale;
  if (code.includes('MEAL')) return UtensilsCrossed;
  if (code.includes('PROTEIN')) return TrendingUp;
  if (code.includes('STREAK')) return CalendarDays;

  return Zap;
}

/**
 * Get a descriptive label for task type (for accessibility)
 */
export function getTaskIconLabel(keyCode: string): string {
  const code = keyCode.toUpperCase();

  if (code.includes('WEIGH')) return 'שקילה';
  if (code.includes('MEAL')) return 'תיעוד ארוחות';
  if (code.includes('PROTEIN')) return 'יעד חלבון';
  if (code.includes('STREAK')) return 'רצף ימים';

  return 'משימה';
}
