/**
 * Intent Detection for AI Coach
 *
 * Detects user intent from Hebrew messages to enable direct data responses
 * without calling the AI model when possible.
 */

export type UserIntent =
  | "nutrition_today"
  | "nutrition_week"
  | "weight_trend"
  | "last_meals"
  | "free";

/**
 * Detect intent from user message (Hebrew keywords)
 *
 * @param message - User message in Hebrew
 * @returns Detected intent
 */
export function detectIntent(message: string): UserIntent {
  const normalized = message.toLowerCase().trim();

  // Nutrition today
  if (
    normalized.includes("היום") ||
    normalized.includes("כמה קלוריות") ||
    normalized.includes("כמה חלבון היום") ||
    normalized.includes("מה אכלתי היום") ||
    normalized.includes("צרכתי היום") ||
    normalized.match(/כמה.*היום/)
  ) {
    return "nutrition_today";
  }

  // Nutrition week
  if (
    normalized.includes("בשבוע") ||
    normalized.includes("7 ימים") ||
    normalized.includes("שבעה ימים") ||
    normalized.includes("השבוע") ||
    normalized.includes("ממוצע שבועי") ||
    normalized.match(/כמה.*שבוע/)
  ) {
    return "nutrition_week";
  }

  // Weight trend
  if (
    normalized.includes("משקל") ||
    normalized.includes("מגמה") ||
    normalized.includes("עליתי") ||
    normalized.includes("ירדתי") ||
    normalized.includes("שקילה") ||
    normalized.includes("כמה שוקל") ||
    normalized.includes("כמה שוקלת") ||
    normalized.match(/מה.*משקל/)
  ) {
    return "weight_trend";
  }

  // Last meals
  if (
    normalized.includes("מה אכלתי") ||
    normalized.includes("ארוחות אחרונות") ||
    normalized.includes("מה צרכתי") ||
    normalized.includes("אכלתי לאחרונה") ||
    normalized.match(/מה.*אכל/)
  ) {
    return "last_meals";
  }

  // Default to free (requires AI model)
  return "free";
}

/**
 * Get a friendly intent name for logging
 *
 * @param intent - User intent
 * @returns Hebrew name for the intent
 */
export function getIntentName(intent: UserIntent): string {
  switch (intent) {
    case "nutrition_today":
      return "תזונה היום";
    case "nutrition_week":
      return "תזונה שבועית";
    case "weight_trend":
      return "מגמת משקל";
    case "last_meals":
      return "ארוחות אחרונות";
    case "free":
      return "שאלה חופשית";
  }
}
