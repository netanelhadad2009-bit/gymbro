// apps/web/lib/i18n/diet.ts
const HEBREW = {
  none: "לא עוקבת אחרי דיאטה מסוימת",
  vegan: "טבעונית",
  vegetarian: "צמחונית",
  keto: "קטוגנית",
  paleo: "פליאוליתית",
} as const;

// Normalize incoming values and map to the exact Hebrew label above.
export function dietLabel(value?: string | null): string {
  if (!value) return "—";

  // If already one of our exact Hebrew labels, return as-is
  const hebList = new Set(Object.values(HEBREW));
  if (hebList.has(value as any)) return value;

  // Also check for gender variations and alternative spellings
  const hebVariations: Record<string, string> = {
    "לא עוקב אחרי דיאטה מסוימת": HEBREW.none,
    "לא עוקב/ת אחרי דיאטה מסוימת": HEBREW.none,
    "טבעוני": HEBREW.vegan,
    "טבעוני/ת": HEBREW.vegan,
    "צמחוני": HEBREW.vegetarian,
    "צמחוני/ת": HEBREW.vegetarian,
    "קטוגני": HEBREW.keto,
    "קטוגני/ת": HEBREW.keto,
    "פלאוליתי": HEBREW.paleo,
    "פלאוליתית": HEBREW.paleo,
    "פליאוליתי": HEBREW.paleo,
    "פלאוליתי/ת": HEBREW.paleo,
    "פליאוליתי/ת": HEBREW.paleo,
  };
  if (value in hebVariations) return hebVariations[value];

  // Normalize common English inputs
  const norm = String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  switch (norm) {
    case "none":
    case "no restrictions":
    case "regular":
    case "standard":
    case "omnivore":
      return HEBREW.none;
    case "vegan":
      return HEBREW.vegan;
    case "vegetarian":
    case "lacto ovo":
    case "lacto-ovo":
      return HEBREW.vegetarian;
    case "keto":
    case "ketogenic":
      return HEBREW.keto;
    case "paleo":
    case "palaeolithic":
    case "paleolithic":
      return HEBREW.paleo;
    default:
      return "—"; // Unknown → em dash
  }
}
