/**
 * Direct Response Generator for AI Coach
 *
 * Generates plain-text English responses directly from user data
 * without calling the AI model, for structured intents.
 */

import type { UserContext } from "./context";
import {
  getTodayNutrition,
  getWeeklyNutrition,
  summarizeWeighInsForPrompt,
  checkDataCompleteness,
} from "./context";
import type { UserIntent } from "./intent";

/**
 * Generate direct response for structured intents
 *
 * @param intent - Detected user intent
 * @param ctx - User context with data
 * @returns Plain-text English response, or null if AI model is needed
 */
export function generateDirectResponse(
  intent: UserIntent,
  ctx: UserContext | null
): string | null {
  // Check data completeness
  const completeness = checkDataCompleteness(ctx);

  switch (intent) {
    case "nutrition_today":
      return generateNutritionTodayResponse(ctx, completeness);

    case "nutrition_week":
      return generateNutritionWeekResponse(ctx, completeness);

    case "weight_trend":
      return generateWeightTrendResponse(ctx, completeness);

    case "last_meals":
      return generateLastMealsResponse(ctx, completeness);

    case "free":
      // Requires AI model
      return null;

    default:
      return null;
  }
}

/**
 * Generate response for "nutrition today" intent
 */
function generateNutritionTodayResponse(
  ctx: UserContext | null,
  completeness: ReturnType<typeof checkDataCompleteness>
): string {
  const today = getTodayNutrition(ctx);

  if (!today) {
    return "You haven't logged any meals today yet. Add a meal so I can track your nutrition.";
  }

  const lines: string[] = [];

  // Main stats
  lines.push(
    `Today you consumed ${today.calories} calories: ${today.protein}g protein, ${today.carbs}g carbs, ${today.fat}g fat.`
  );

  // Meal count
  if (today.meal_count === 1) {
    lines.push("You logged 1 meal.");
  } else {
    lines.push(`You logged ${today.meal_count} meals.`);
  }

  // Add goal comparison if profile exists
  if (ctx?.profile?.goal) {
    const goal = ctx.profile.goal;
    let targetCals = 2200; // default

    // Rough estimation based on goal
    if (goal === "loss") {
      targetCals = 1800;
      const diff = targetCals - today.calories;
      if (diff > 200) {
        lines.push(`You're ${Math.abs(diff)} calories below your deficit target - great job!`);
      } else if (diff < -200) {
        lines.push(`You're ${Math.abs(diff)} calories above your deficit target.`);
      } else {
        lines.push("You're within your target range.");
      }
    } else if (goal === "gain") {
      targetCals = 2800;
      const diff = today.calories - targetCals;
      if (diff > 0) {
        lines.push(`You're in a surplus of ${diff} calories - great for building muscle.`);
      } else {
        lines.push(`${Math.abs(diff)} more calories needed to reach your surplus target.`);
      }
    }
  }

  return lines.join(" ");
}

/**
 * Generate response for "nutrition week" intent
 */
function generateNutritionWeekResponse(
  ctx: UserContext | null,
  completeness: ReturnType<typeof checkDataCompleteness>
): string {
  const weekly = getWeeklyNutrition(ctx);

  if (!weekly) {
    return "Not enough data for the last week. Log meals regularly so I can track your averages.";
  }

  const lines: string[] = [];

  lines.push(
    `On average over the last 7 days, you consumed ${weekly.calories} calories and ${weekly.protein}g protein per day.`
  );

  // Add trend analysis if we have daily data
  if (ctx?.nutrition?.daily_totals && ctx.nutrition.daily_totals.length >= 5) {
    const recent3 = ctx.nutrition.daily_totals.slice(0, 3);
    const older3 = ctx.nutrition.daily_totals.slice(3, 6);

    const recentAvg =
      recent3.reduce((sum, d) => sum + d.calories, 0) / recent3.length;
    const olderAvg = older3.reduce((sum, d) => sum + d.calories, 0) / older3.length;

    const diff = recentAvg - olderAvg;
    if (diff > 100) {
      lines.push("Your calories have increased in recent days.");
    } else if (diff < -100) {
      lines.push("Your calories have decreased in recent days.");
    } else {
      lines.push("Your calories are stable.");
    }
  }

  return lines.join(" ");
}

/**
 * Generate response for "weight trend" intent
 */
function generateWeightTrendResponse(
  ctx: UserContext | null,
  completeness: ReturnType<typeof checkDataCompleteness>
): string {
  if (!completeness.hasWeighIns) {
    return "No weigh-in data available. Add weigh-ins regularly (at least once a week) to track your weight trend.";
  }

  return summarizeWeighInsForPrompt(ctx);
}

/**
 * Generate response for "last meals" intent
 */
function generateLastMealsResponse(
  ctx: UserContext | null,
  completeness: ReturnType<typeof checkDataCompleteness>
): string {
  if (!ctx?.recent_meals || ctx.recent_meals.length === 0) {
    return "No meals logged. Add meals so I can track your nutrition.";
  }

  const lines: string[] = ["Your recent meals:"];

  for (const meal of ctx.recent_meals) {
    const date = new Date(meal.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    lines.push(
      `${meal.name} (${date}): ${meal.calories}kcal, ${meal.protein}P/${meal.carbs}C/${meal.fat}F`
    );
  }

  return lines.join("\n");
}
