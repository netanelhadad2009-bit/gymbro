/**
 * Progress formatting utilities
 */

export function formatKg(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${value.toFixed(1)} ק"ג`;
}

export function formatKcal(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${Math.round(value)}`;
}

export function formatGrams(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${Math.round(value)}g`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${day}.${month}`;
  } catch {
    return dateString;
  }
}

export function formatDateLong(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatDelta(value: number | null | undefined, unit: string = "ק\"ג"): string {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${unit}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "-";
  return `${Math.round(value)}%`;
}

/**
 * Get color variant based on delta value
 */
export function getDeltaVariant(
  value: number | null | undefined,
  isWeightLoss: boolean = true
): "success" | "danger" | "neutral" {
  if (value == null) return "neutral";

  if (Math.abs(value) < 0.1) return "neutral";

  // For weight loss goals, negative delta is success
  // For weight gain goals, positive delta is success
  if (isWeightLoss) {
    return value < 0 ? "success" : "danger";
  } else {
    return value > 0 ? "success" : "danger";
  }
}

/**
 * Get color variant for calorie comparison
 */
export function getCalorieVariant(
  actual: number | null | undefined,
  target: number
): "success" | "warning" | "neutral" {
  if (actual == null) return "neutral";

  const diff = Math.abs(actual - target);

  if (diff < 100) return "success";
  if (diff < 300) return "warning";
  return "neutral";
}
