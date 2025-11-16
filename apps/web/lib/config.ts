/**
 * Application configuration
 * Centralized feature flags and environment settings
 */

/**
 * Feature flag: Enable/disable workout program generation
 * Set to false to disable all workout-related API calls and UI
 */
export const WORKOUTS_ENABLED =
  process.env.NEXT_PUBLIC_WORKOUTS_ENABLED === "true" ||
  process.env.WORKOUTS_ENABLED === "true" ||
  false;

/**
 * Number of days for nutrition plan generation
 * Currently fixed to 1 day (meals repeat across days)
 */
export const NUTRITION_DAYS = 1;
