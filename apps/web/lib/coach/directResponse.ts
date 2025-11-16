/**
 * Direct Response Generator for AI Coach
 *
 * Generates plain-text Hebrew responses directly from user data
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
 * @returns Plain-text Hebrew response, or null if AI model is needed
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
    return "עדיין לא צרכת ארוחות היום. תוכל/י להוסיף ארוחה כדי שאוכל לעקוב אחרי התזונה שלך.";
  }

  const lines: string[] = [];

  // Main stats
  lines.push(
    `היום צרכת ${today.calories} קלוריות: ${today.protein}g חלבון, ${today.carbs}g פחמימות, ${today.fat}g שומן.`
  );

  // Meal count
  if (today.meal_count === 1) {
    lines.push("רשמת ארוחה אחת.");
  } else {
    lines.push(`רשמת ${today.meal_count} ארוחות.`);
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
        lines.push(`אתה/את ${Math.abs(diff)} קלוריות מתחת ליעד הגירעון - מצוין!`);
      } else if (diff < -200) {
        lines.push(`אתה/את ${Math.abs(diff)} קלוריות מעל ליעד הגירעון.`);
      } else {
        lines.push("אתה/את בטווח היעד שלך.");
      }
    } else if (goal === "gain") {
      targetCals = 2800;
      const diff = today.calories - targetCals;
      if (diff > 0) {
        lines.push(`אתה/את בעודף של ${diff} קלוריות - מעולה לעלייה במסה.`);
      } else {
        lines.push(`עוד ${Math.abs(diff)} קלוריות כדי להגיע ליעד העודף.`);
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
    return "אין מספיק נתונים לשבוע האחרון. הוסיפ/י ארוחות באופן קבוע כדי שאוכל לעקוב אחרי הממוצעים.";
  }

  const lines: string[] = [];

  lines.push(
    `בממוצע ב-7 הימים האחרונים צרכת ${weekly.calories} קלוריות ו-${weekly.protein}g חלבון ביום.`
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
      lines.push("הקלוריות שלך עלו בימים האחרונים.");
    } else if (diff < -100) {
      lines.push("הקלוריות שלך ירדו בימים האחרונים.");
    } else {
      lines.push("הקלוריות שלך יציבות.");
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
    return "אין נתוני שקילה זמינים. הוסיפ/י שקילות באופן קבוע (לפחות פעם בשבוע) כדי לעקוב אחרי המגמה במשקל.";
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
    return "אין ארוחות רשומות. הוסיפ/י ארוחות כדי שאוכל לעקוב אחרי התזונה שלך.";
  }

  const lines: string[] = ["הארוחות האחרונות שלך:"];

  for (const meal of ctx.recent_meals) {
    const date = new Date(meal.created_at).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
    });
    lines.push(
      `${meal.name} (${date}): ${meal.calories}kcal, ${meal.protein}P/${meal.carbs}C/${meal.fat}F`
    );
  }

  return lines.join("\n");
}
