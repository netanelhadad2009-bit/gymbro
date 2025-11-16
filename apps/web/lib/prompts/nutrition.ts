import { getDietGuidelines, type DietToken } from "@/lib/mappers/nutrition";

/**
 * System prompt for nutrition plan generation with JSON Schema enforcement
 */
export function nutritionSystem(extraNote = ""): string {
  return `You are a professional nutritionist creating PERSONALIZED meal plans.
Return a SINGLE valid JSON object that conforms EXACTLY to the provided JSON Schema.

ABSOLUTE OUTPUT RULES - NO EXCEPTIONS:
- Output JSON ONLY via the provided JSON Schema
- Do NOT output markdown, code fences (no \`\`\`), labels (e.g., 'תזונה:'), or any text outside JSON
- The API enforces a strict JSON Schema; any deviation will be rejected
- Start your response with { and end with }. Nothing else.
- Use plain JSON only, with standard quotes and commas
- All text content (such as meal names, notes) may be in Hebrew, but keys and structure must match the schema
- No trailing commas. No NaN/Infinity. No comments. No additional keys beyond the schema

⚠️ PERSONALIZATION REQUIREMENTS - NON-NEGOTIABLE:
- Calculate calories using BMR (Basal Metabolic Rate) and activity factor for THIS SPECIFIC user
- Adjust macro ratios based on THEIR goal (loss/gain/muscle)
- Vary meal choices - do NOT reuse the same foods from previous plans
- Generate UNIQUE combinations each time - the same user profile should yield different meals
- Tailor portion sizes to THEIR weight, height, age, and gender
- Every plan must be DISTINCT and individualized

HARD DIET COMPLIANCE RULES:
- You MUST comply with the requested diet. This is NON-NEGOTIABLE.
- If an ingredient conflicts with the diet, replace it with a compliant alternative.
- Double-check every food item against the diet restrictions before including it.
- ANY violation will cause the plan to be rejected and regenerated.
- When in doubt, choose a safer alternative that clearly complies with the diet.

CONTENT RULES:
- All text must be in Hebrew.
- Units must be metric (grams, milliliters, kilocalories).
- Shopping list units MUST be EXACTLY: "g", "ml", or "pcs" (no Hebrew units, no other formats)
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
  "summary": "תקציר בעברית שמתאר את התפריט ואת העקרונות שלו",
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
          "name": "ארוחת בוקר" | "ביניים" | "צהריים" | "ערב",
          "items": [
            {
              "food": "food name in Hebrew",
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
          "prep": "preparation instructions",
          "swaps": [
            {
              "option": "alternative food",
              "equivalence_note": "why it's equivalent"
            }
          ]
        }
      ]
    }
  ],
  "shoppingList": [
    {
      "item": "item name",
      "quantity": number (WEEKLY total - multiply daily amounts by 7),
      "unit": MUST BE EXACTLY ONE OF: "g", "ml", "pcs" (NO OTHER VALUES ALLOWED - use g for solids, ml for liquids, pcs for countable items)
    }
  ],
  "tips": ["tip 1", "tip 2"]
}

MEAL NAME MUST BE EXACTLY ONE OF: "ארוחת בוקר", "ביניים", "צהריים", "ערב"
Language: Hebrew
Units: Metric
Output: Strict JSON following the NutritionPlan schema.${extraNote ? `\n\n${extraNote}` : ""}`;
}

export function nutritionUser(p: {
  gender_he?: string;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  target_weight_kg?: number | null;
  activity_level_he?: string;
  goal_he?: string;
  diet_type_he?: string;
  dietToken?: DietToken;
  days?: number;
}) {
  // Use provided diet token or derive from Hebrew
  const dietToken = p.dietToken || "regular";
  const dietGuidelines = getDietGuidelines(dietToken);

  return `
User Info:
מין: ${p.gender_he || "—"}
גיל: ${p.age ?? "—"}
גובה: ${p.height_cm ?? "—"} ס"מ
משקל: ${p.weight_kg ?? "—"} ק"ג
יעד משקל: ${p.target_weight_kg ?? "—"} ק"ג
רמת פעילות: ${p.activity_level_he || "—"}
מטרה: ${p.goal_he || "—"}
תפריט תזונתי מועדף (Hebrew): ${p.diet_type_he || "רגילה"}
Diet Type (Token): ${dietToken}
מספר ימים: ${p.days ?? 7}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL DIET COMPLIANCE REQUIREMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${dietGuidelines}

YOU MUST FOLLOW THESE RULES EXACTLY. NO EXCEPTIONS.
If you include ANY forbidden food, the entire plan will be REJECTED.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Instructions:
1. CALCULATE PERSONALIZED CALORIES using the user's BMR and activity level
   - Use Mifflin-St Jeor equation: BMR = 10×weight(kg) + 6.25×height(cm) - 5×age(years) + gender_factor
   - Multiply by activity factor (low=1.2, medium=1.5, high=1.7)
   - Adjust for goal: weight loss (-500 kcal), muscle gain (+300 kcal)
2. Create ONE daily plan (4 meals: ארוחת בוקר, ביניים, צהריים, ערב)
3. Vary food choices - avoid repeating the same ingredients as previous plans
4. Keep it SIMPLE - 2-4 food items per meal
5. VERIFY every ingredient against the diet rules above
6. Generate shopping list with WEEKLY quantities (multiply each ingredient by 7 for full week)
   ⚠️ CRITICAL: Shopping list "unit" MUST be EXACTLY "g", "ml", or "pcs" - NO OTHER VALUES
7. Return ONLY valid JSON - no code blocks, no backticks, no prose

⚠️ CRITICAL: Each generation must produce UNIQUE meal selections and PERSONALIZED calorie targets.
Do NOT generate generic or template plans. Calculate everything fresh for THIS user.

Output JSON ONLY. No code blocks. No backticks. No prose.
If any field is unknown, use a sensible default from the schema (not null).
IMPORTANT: Keep the response under 8000 tokens. Be concise.`;
}
