/**
 * Empty data helpers for Progress charts
 * Ensures charts render with axes and labels even when no data exists
 */

export const EMPTY_SERIES: number[] = [];
export const EMPTY_LABELS: string[] = [];

/**
 * Create an array of zeros for empty chart series
 * @param n - Number of data points (default: 7)
 */
export const ZERO_SERIES = (n = 7) => Array.from({ length: n }, () => 0);

/**
 * Ensure value is an array, return empty array if null/undefined
 */
export const ensureArray = <T,>(x: T[] | undefined | null): T[] =>
  Array.isArray(x) ? x : [];

/**
 * Generate placeholder date labels for empty charts
 * @param days - Number of days to generate labels for (default: 7)
 */
export const generateEmptyDateLabels = (days = 7): string[] => {
  const labels: string[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    labels.push(`${day}/${month}`);
  }

  return labels;
};
