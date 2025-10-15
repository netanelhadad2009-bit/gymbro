/**
 * GymBro Journey Design Tokens
 * Brand-aligned color system and spacing for the stage map
 */

export const colors = {
  // Base
  bg: "#0e0f12",
  surface: "#14161a",
  surfaceElevated: "#191c21",
  
  // Text
  text: "#ffffff",
  textMuted: "#b7c0c8",
  
  // Brand
  accent: "#E2F163",  // GymBro primary lime
  
  // Borders
  outline: "#2a3036",
  
  // Semantic
  success: "#6fe3a1",
  warning: "#ffb020",
  danger: "#ff5a5a",
  
  // Stage-specific
  stageDefault: "#E2F163",
  stageLocked: "#4a4a4a",
  stageProgress: "#FFB020",
  stageComplete: "#6fe3a1",
} as const;

export const radii = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  pill: "999px",
} as const;

export const shadows = {
  sm: "0 2px 8px rgba(0, 0, 0, 0.12)",
  md: "0 4px 16px rgba(0, 0, 0, 0.16)",
  lg: "0 8px 24px rgba(0, 0, 0, 0.20)",
  glow: "0 0 20px rgba(226, 241, 99, 0.3)",
} as const;

export const z = {
  bg: 0,
  path: 1,
  nodes: 2,
  overlays: 3,
  sheet: 10,
  modal: 20,
} as const;

export const fontSize = {
  xs: "12px",
  sm: "14px",
  base: "16px",
  lg: "18px",
  xl: "24px",
  "2xl": "32px",
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;
