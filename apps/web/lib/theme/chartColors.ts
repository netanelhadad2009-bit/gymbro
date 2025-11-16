/**
 * GymBro Brand Color System for Charts
 * Centralized color tokens for consistent theming across all visualizations
 */

export const chartColors = {
  // Core backgrounds
  background: "#0E0F10",
  surface: "#141516",

  // Text colors
  textPrimary: "#FFFFFF",
  textSecondary: "#A5A7AA",

  // Brand accent
  accent: "#E2F163",

  // Trend indicators
  positive: "#9BEF7D",
  negative: "#FF6B6B",
  neutral: "#3A3B3D",

  // Macro colors (matching nutrition page)
  protein: "#C9456C",  // Pink/Red
  carbs: "#FFA856",    // Orange
  fat: "#5B9BFF",      // Blue
} as const;

/**
 * Chart.js compatible gradient generator for area fills
 */
export function createGradient(
  ctx: CanvasRenderingContext2D,
  color: string,
  opacity: number = 0.2
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
  gradient.addColorStop(1, `${color}00`);
  return gradient;
}

/**
 * Generate hover glow shadow
 */
export function getGlowShadow(color: string, intensity: number = 0.4): string {
  return `0 0 10px ${color}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`;
}

/**
 * Grid line configuration
 */
export const gridConfig = {
  color: "rgba(255, 255, 255, 0.05)",
  drawTicks: false,
};

/**
 * Axis configuration
 */
export const axisConfig = {
  color: chartColors.textSecondary,
  font: {
    size: 11,
    family: "system-ui, -apple-system, sans-serif",
  },
};

/**
 * Animation configuration
 */
export const animationConfig = {
  duration: 300,
  easing: "easeInOutCubic" as const,
};
