/**
 * Formats an ISO date string to Hebrew-friendly DD.MM.YYYY format
 */
export function formatHebDate(iso: string): string {
  try {
    const date = new Date(iso);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  } catch {
    return '';
  }
}

/**
 * Calculates days remaining from a start date and total days estimate
 */
export function calculateDaysRemaining(startDate: string, totalDays: number): number {
  try {
    const start = new Date(startDate);
    const today = new Date();
    const daysPassed = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, totalDays - daysPassed);
  } catch {
    return totalDays;
  }
}
