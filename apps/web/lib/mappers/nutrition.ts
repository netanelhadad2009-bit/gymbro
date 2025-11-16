export function mapGoalHeToToken(s?: string) {
  const x = (s || "").trim();
  if (["ירידה במשקל", "שריפת שומן", "הורדה באחוזי שומן"].includes(x)) return "weight_loss";
  if (["עלייה במסת שריר", "מסה", "היפרטרופיה"].includes(x)) return "muscle_gain";
  return "body_maintenance"; // לשמור על הרגלים ולשמור על הגוף
}

export function mapActivityHe(s?: string) {
  const x = (s || "").trim();
  if (["נמוכה", "ללא פעילות"].includes(x)) return "low";
  if (["גבוהה", "גבוה"].includes(x)) return "high";
  return "medium";
}

/**
 * Diet type token for internal use
 */
export type DietToken = "vegan" | "vegetarian" | "keto" | "paleo" | "regular";

/**
 * Map Hebrew diet type OR English token to normalized token (strict version)
 */
export function mapDietHeToToken(input?: string): DietToken {
  const normalized = (input || "").trim().toLowerCase();

  // Check Hebrew names
  if (normalized.includes("טבעוני")) return "vegan";
  if (normalized.includes("צמחוני")) return "vegetarian";
  if (normalized.includes("קטוגני") || normalized.includes("קטו")) return "keto";
  if (normalized.includes("פלאו") || normalized.includes("פליאו")) return "paleo";

  // Check English tokens (from diet selection page)
  if (normalized === "vegan") return "vegan";
  if (normalized === "vegetarian") return "vegetarian";
  if (normalized === "keto") return "keto";
  if (normalized === "paleo") return "paleo";
  if (normalized === "none") return "regular";

  // Default to regular
  return "regular";
}

/**
 * Legacy function - use mapDietHeToToken instead
 * @deprecated
 */
export function mapDietHe(s?: string) {
  return mapDietHeToToken(s);
}

/**
 * Get short Hebrew label from diet token for UI
 */
export function dietLabelFromToken(token: DietToken): string {
  const labels: Record<DietToken, string> = {
    vegan: "טבעוני",
    vegetarian: "צמחוני",
    keto: "קטוגני",
    paleo: "פליאו",
    regular: "רגיל",
  };

  return labels[token];
}

/**
 * Get diet guidelines for prompts
 */
export function getDietGuidelines(token: DietToken): string {
  const guidelines: Record<DietToken, string> = {
    vegan: `VEGAN DIET RULES:
- ALLOWED: All plant-based foods (vegetables, fruits, grains, legumes, nuts, seeds, tofu, tempeh, plant milk)
- STRICTLY AVOID: ALL animal products (meat, poultry, fish, seafood, eggs, dairy, milk, cheese, yogurt, butter, honey)`,

    vegetarian: `VEGETARIAN DIET RULES (PESCATARIAN):
- ALLOWED: Plant-based foods, dairy products (milk, cheese, yogurt, butter), eggs, FISH and seafood
- STRICTLY AVOID: Meat, poultry (chicken, turkey, beef, pork, lamb, etc.)`,

    keto: `KETOGENIC DIET RULES:
- ALLOWED: High-fat foods (meat, fish, eggs, cheese, avocado, nuts, seeds, oils, low-carb vegetables)
- STRICTLY AVOID: Grains (bread, pasta, rice, wheat), sugar, high-carb fruits (banana, grapes, mango), legumes (beans, lentils), starchy vegetables (potato, corn)
- REQUIREMENT: Keep net carbs under 30-50g per day, prioritize fats and proteins`,

    paleo: `PALEO DIET RULES:
- ALLOWED: Whole foods (meat, fish, eggs, vegetables, fruits, nuts, seeds)
- STRICTLY AVOID: Grains (bread, pasta, rice, wheat, oats), legumes (beans, lentils, peanuts), dairy, refined sugar, processed oils, processed foods`,

    regular: `REGULAR/BALANCED DIET:
- No specific restrictions
- Focus on whole foods, balanced macros, and variety
- Healthy portions and nutrient-dense choices`,
  };

  return guidelines[token];
}

/**
 * Get forbidden food keywords for diet compliance checking
 */
export function getForbiddenKeywords(token: DietToken): { hebrew: string[]; english: string[] } {
  const forbidden: Record<DietToken, { hebrew: string[]; english: string[] }> = {
    vegan: {
      hebrew: [
        // Meat & Poultry
        "בשר", "עוף", "תרנגול", "הודו", "בקר", "עגל", "כבש", "טלה", "חזיר",
        // Fish & Seafood
        "דג", "דגים", "טונה", "סלמון", "בקלה", "קרפיון", "שרימפס", "סרטן", "פירות ים",
        // Eggs
        "ביצה", "ביצים", "חלמון", "חלבון ביצה",
        // Dairy
        "חלב", "גבינה", "יוגורט", "חמאה", "שמנת", "קוטג'", "מוצרלה", "פטה", "צהוב", "לבן", "חלבי",
        // Honey
        "דבש",
      ],
      english: [
        // Meat & Poultry
        "meat", "beef", "pork", "lamb", "veal", "chicken", "turkey", "duck", "goose",
        // Fish & Seafood
        "fish", "tuna", "salmon", "cod", "tilapia", "shrimp", "crab", "lobster", "seafood",
        // Eggs
        "egg", "eggs", "yolk", "white",
        // Dairy
        "milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "cottage", "mozzarella", "feta", "cheddar", "parmesan", "dairy",
        // Honey
        "honey",
      ],
    },

    vegetarian: {
      hebrew: [
        // Meat & Poultry ONLY (fish is acceptable for vegetarians in this context)
        "בשר", "עוף", "חזה עוף", "תרנגול", "הודו", "בקר", "עגל", "כבש", "טלה", "חזיר", "נקניק", "המבורגר",
      ],
      english: [
        // Meat & Poultry ONLY (fish is acceptable for vegetarians in this context)
        "meat", "beef", "pork", "lamb", "veal", "chicken", "chicken breast", "turkey", "duck", "goose", "sausage", "burger", "ham", "bacon",
      ],
    },

    keto: {
      hebrew: [
        // Grains & Bread
        "לחם", "פיתה", "בורקס", "פסטה", "ספגטי", "אטריות", "אורז", "קוסקוס", "בורגול", "שיבולת שועל", "קוואקר",
        "דגנים", "חיטה", "קמח", "שיפון",
        // High-carb foods
        "תפוח אדמה", "תפוד", "בטטה", "תירס", "קורנפלקס",
        // Sugar & Sweets
        "סוכר", "דבש", "ריבה", "שוקולד", "עוגה", "עוגיה",
        // High-carb fruits
        "בננה", "ענבים", "מנגו", "תמר", "צימוקים",
        // Legumes
        "שעועית", "עדשים", "חומוס", "אפונה", "קטניות",
      ],
      english: [
        // Grains & Bread
        "bread", "pita", "pasta", "spaghetti", "noodles", "rice", "couscous", "bulgur", "oats", "oatmeal", "cereal", "grain", "wheat", "flour",
        // High-carb foods
        "potato", "potatoes", "sweet potato", "corn", "cornflakes",
        // Sugar & Sweets
        "sugar", "honey", "jam", "chocolate", "cake", "cookie", "cookies",
        // High-carb fruits
        "banana", "grapes", "mango", "dates", "raisins",
        // Legumes
        "beans", "lentils", "chickpeas", "peas", "legumes",
      ],
    },

    paleo: {
      hebrew: [
        // Grains
        "לחם", "פיתה", "פסטה", "אורז", "קוסקוס", "שיבולת שועל", "דגנים", "חיטה", "קמח",
        // Legumes
        "שעועית", "עדשים", "חומוס", "אפונה", "בוטנים", "קטניות",
        // Dairy
        "חלב", "גבינה", "יוגורט", "חמאה", "שמנת", "חלבי",
        // Refined sugar
        "סוכר", "סוכר לבן",
        // Processed
        "שמן צמחי", "שמן חמניות", "מרגרינה",
      ],
      english: [
        // Grains
        "bread", "pasta", "rice", "couscous", "oats", "oatmeal", "cereal", "grain", "wheat", "flour",
        // Legumes
        "beans", "lentils", "chickpeas", "peas", "peanuts", "legumes",
        // Dairy
        "milk", "cheese", "yogurt", "yoghurt", "butter", "cream", "dairy",
        // Refined sugar
        "sugar", "refined sugar",
        // Processed oils
        "vegetable oil", "sunflower oil", "margarine", "canola oil",
      ],
    },

    regular: {
      hebrew: [],
      english: [],
    },
  };

  return forbidden[token];
}
