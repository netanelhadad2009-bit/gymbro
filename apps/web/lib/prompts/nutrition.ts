import { getDietGuidelines, type DietToken } from "@/lib/mappers/nutrition";

/**
 * System prompt for nutrition plan generation with JSON Schema enforcement (English)
 */
export function nutritionSystem(extraNote = ""): string {
  return `You are a professional nutritionist creating PERSONALIZED meal plans.
Return a SINGLE valid JSON object that conforms EXACTLY to the provided JSON Schema.

ABSOLUTE OUTPUT RULES - NO EXCEPTIONS:
- Output JSON ONLY via the provided JSON Schema
- Do NOT output markdown, code fences (no \`\`\`), labels, or any text outside JSON
- The API enforces a strict JSON Schema; any deviation will be rejected
- Start your response with { and end with }. Nothing else.
- Use plain JSON only, with standard quotes and commas
- All text content (meal names, notes, descriptions) should be in English
- Keys and structure must match the schema exactly
- No trailing commas. No NaN/Infinity. No comments. No additional keys beyond the schema

⚠️ PERSONALIZATION REQUIREMENTS - NON-NEGOTIABLE:
- Calculate calories using BMR (Basal Metabolic Rate) and activity factor for THIS SPECIFIC user
- Adjust macro ratios based on THEIR goal (loss/gain/recomp/maintain)
- Vary meal choices - do NOT reuse the same foods from previous plans
- Generate UNIQUE combinations each time - the same user profile should yield different meals
- Tailor portion sizes to THEIR weight, height, age, and gender
- Every plan must be DISTINCT and individualized

HARD DIET COMPLIANCE RULES:
- You MUST comply with the requested diet. This is NON-NEGOTIABLE.
- If an ingredient conflicts with the diet, replace it with a compliant alternative.
- Double-check every food item against the diet restrictions before including it.
- ANY violation will cause the plan to be REJECTED and regenerated.
- When in doubt, choose a safer alternative that clearly complies with the diet.

CONTENT RULES:
- All user-facing text must be in English (meal names, food items, descriptions).
- Units must be metric (grams, milliliters, kilocalories).
- Shopping list units MUST be EXACTLY: "g", "ml", or "pcs" (no other formats)
- Adapt to their fitness goal (fat loss, muscle gain, recomposition, maintenance).
- Macronutrients and food choices should reflect both the goal and the chosen diet.
- Focus on accessible, realistic meals using common whole foods.
- Include accurate portion sizes, protein/carbs/fats per meal, and total calories per day.

STRUCTURE RULES:
- Create ONE daily meal plan template.
- Return ONLY ONE day in the "days" array with day: 1.
- Keep it concise to avoid token limits.
- If any field is unknown, use a sensible default from the schema (not null).

EXACT JSON STRUCTURE REQUIRED:
{
  "summary": "English summary describing the meal plan and its principles",
  "dailyTargets": {
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "fiber_g": number,
    "water_l": number
  },
  "days": [
    {
      "day": number (1, 2, 3...),
      "meals": [
        {
          "name": "Breakfast" | "Snack" | "Lunch" | "Dinner",
          "items": [
            {
              "food": "food name in English",
              "amount_g": number,
              "notes": "optional notes"
            }
          ],
          "macros": {
            "calories": number,
            "protein_g": number,
            "carbs_g": number,
            "fat_g": number
          },
          "prep": "preparation instructions in English",
          "swaps": [
            {
              "option": "alternative food in English",
              "equivalence_note": "why it's equivalent in English"
            }
          ]
        }
      ]
    }
  ],
  "shoppingList": [
    {
      "item": "item name in English",
      "quantity": number (WEEKLY total - multiply daily amounts by 7),
      "unit": MUST BE EXACTLY ONE OF: "g", "ml", "pcs" (NO OTHER VALUES ALLOWED - use g for solids, ml for liquids, pcs for countable items)
    }
  ],
  "tips": ["tip 1 in English", "tip 2 in English"]
}

MEAL NAME MUST BE EXACTLY ONE OF: "Breakfast", "Snack", "Lunch", "Dinner"
Language: English (for user-facing text)
Units: Metric
Output: Strict JSON following the NutritionPlan schema.${extraNote ? `\n\n${extraNote}` : ""}`;
}

/**
 * User prompt for nutrition plan generation (English with user data)
 */
export function nutritionUser(p: {
  gender?: string;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  target_weight_kg?: number | null;
  activity?: string;
  goal?: string;
  diet?: string;
  dietToken?: DietToken;
  days?: number;
}) {
  // Use provided diet token or map from diet enum
  const dietToken = p.dietToken || "regular";
  const dietGuidelines = getDietGuidelines(dietToken);

  // Convert English enums to readable format
  const genderLabel = p.gender === "male" ? "Male" : p.gender === "female" ? "Female" : "Other";
  const activityLabel =
    p.activity === "sedentary" ? "Sedentary (little or no exercise)" :
    p.activity === "light" ? "Light (exercise 1-3 days/week)" :
    p.activity === "moderate" ? "Moderate (exercise 3-5 days/week)" :
    p.activity === "high" ? "High (exercise 6-7 days/week)" : "Moderate";

  const goalLabel =
    p.goal === "loss" ? "Weight Loss" :
    p.goal === "gain" ? "Muscle Gain" :
    p.goal === "recomp" ? "Body Recomposition" :
    p.goal === "maintain" ? "Weight Maintenance" : "Weight Loss";

  const dietLabel =
    p.diet === "vegan" ? "Vegan" :
    p.diet === "vegetarian" ? "Vegetarian (Pescatarian - includes fish)" :
    p.diet === "keto" ? "Ketogenic" :
    p.diet === "paleo" ? "Paleo" :
    p.diet === "low_carb" ? "Low Carb" :
    p.diet === "mediterranean" ? "Mediterranean" : "Regular/Balanced";

  return `
User Profile:
Gender: ${genderLabel}
Age: ${p.age ?? "—"}
Height: ${p.height_cm ?? "—"} cm
Weight: ${p.weight_kg ?? "—"} kg
Target Weight: ${p.target_weight_kg ?? "—"} kg
Activity Level: ${activityLabel}
Goal: ${goalLabel}
Diet Preference: ${dietLabel}
Diet Token: ${dietToken}
Number of Days: ${p.days ?? 7}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL DIET COMPLIANCE REQUIREMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${dietGuidelines}

YOU MUST FOLLOW THESE RULES EXACTLY. NO EXCEPTIONS.
If you include ANY forbidden food, the entire plan will be REJECTED.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Instructions:
1. CALCULATE PERSONALIZED CALORIES using the user's BMR and activity level
   - Use Mifflin-St Jeor equation: BMR = 10×weight(kg) + 6.25×height(cm) - 5×age(years) + gender_factor (male: +5, female: -161)
   - Multiply by activity factor (sedentary=1.2, light=1.4, moderate=1.6, high=1.8)
   - Adjust for goal: weight loss (-500 kcal), muscle gain (+300 kcal), recomp (maintenance), maintenance (0)
2. Create ONE daily plan (4 meals: Breakfast, Snack, Lunch, Dinner)
3. Vary food choices - avoid repeating the same ingredients as previous plans
4. Keep it SIMPLE - 2-4 food items per meal
5. VERIFY every ingredient against the diet rules above
6. Generate shopping list with WEEKLY quantities (multiply each ingredient by 7 for full week)
   ⚠️ CRITICAL: Shopping list "unit" MUST be EXACTLY "g", "ml", or "pcs" - NO OTHER VALUES
7. Return ONLY valid JSON - no code blocks, no backticks, no prose
8. All user-facing text (meal names, food items, descriptions) must be in ENGLISH

⚠️ CRITICAL: Each generation must produce UNIQUE meal selections and PERSONALIZED calorie targets.
Do NOT generate generic or template plans. Calculate everything fresh for THIS user.

Output JSON ONLY. No code blocks. No backticks. No prose.
If any field is unknown, use a sensible default from the schema (not null).
IMPORTANT: Keep the response under 8000 tokens. Be concise.`;
}
