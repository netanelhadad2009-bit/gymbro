/**
 * Temporary client-side storage for meal review data
 * TTL: 15 minutes
 */

import type { MealReviewCache } from "./types";

const LOG_CACHE = process.env.NEXT_PUBLIC_LOG_CACHE === "1";
const TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Store temporary meal review data
 */
export function setMealReviewCache(userId: string, data: MealReviewCache): void {
  try {
    const key = `mealReview:${userId}`;
    const value = JSON.stringify(data);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(key, value);

      if (LOG_CACHE) {
        console.log("[TempStorage] Set meal review cache:", {
          userId,
          mealName: data.result.meal_name,
          calories: data.result.calories,
          hasImage: !!data.imageUrl,
        });
      }
    }
  } catch (error) {
    console.error("[TempStorage] Failed to set meal review cache:", error);
  }
}

/**
 * Get temporary meal review data
 * Returns null if expired or missing
 */
export function getMealReviewCache(userId: string): MealReviewCache | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const key = `mealReview:${userId}`;
    const value = window.sessionStorage.getItem(key);

    if (!value) {
      if (LOG_CACHE) {
        console.log("[TempStorage] No meal review cache found");
      }
      return null;
    }

    const data: MealReviewCache = JSON.parse(value);
    const age = Date.now() - data.createdAt;

    // Check if expired
    if (age > TTL_MS) {
      if (LOG_CACHE) {
        console.log("[TempStorage] Meal review cache expired:", {
          ageMinutes: Math.floor(age / 60000),
        });
      }
      window.sessionStorage.removeItem(key);
      return null;
    }

    if (LOG_CACHE) {
      console.log("[TempStorage] Got meal review cache:", {
        userId,
        mealName: data.result.meal_name,
        ageSeconds: Math.floor(age / 1000),
      });
    }

    return data;
  } catch (error) {
    console.error("[TempStorage] Failed to get meal review cache:", error);
    return null;
  }
}

/**
 * Clear temporary meal review data
 */
export function clearMealReviewCache(userId: string): void {
  try {
    if (typeof window !== "undefined") {
      const key = `mealReview:${userId}`;
      window.sessionStorage.removeItem(key);

      if (LOG_CACHE) {
        console.log("[TempStorage] Cleared meal review cache:", { userId });
      }
    }
  } catch (error) {
    console.error("[TempStorage] Failed to clear meal review cache:", error);
  }
}
