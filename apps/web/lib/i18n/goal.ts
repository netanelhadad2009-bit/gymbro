export function goalToHe(value?: string | null): string {
  if (!value) return "—";

  // Already Hebrew full text from onboarding goals? Return as-is
  const hebSet = new Set([
    "מסה",
    "חיטוב",
    "ריקומפ",
    "שמירה",
    "ירידה",
    "עלייה",
    "לעלות במסת שריר",
    "לרדת באחוזי שומן ולהתחטב",
    "לשפר הרגלים ולשמור על הגוף"
  ]);
  if (hebSet.has(value)) return value;

  const v = String(value).trim().toLowerCase();
  const map: Record<string, string> = {
    // Onboarding goals page values → display text
    muscle_gain: "לעלות במסת שריר",
    weight_loss: "לרדת באחוזי שומן ולהתחטב",
    body_maintenance: "לשפר הרגלים ולשמור על הגוף",

    // Programs table enum → full Hebrew labels matching onboarding
    gain: "לעלות במסת שריר",
    loss: "לרדת באחוזי שומן ולהתחטב",
    recomp: "לשפר הרגלים ולשמור על הגוף",

    // Alternative/legacy codes → full Hebrew labels
    mass: "לעלות במסת שריר",
    bulk: "לעלות במסת שריר",
    build_muscle: "לעלות במסת שריר",
    strength: "לעלות במסת שריר",
    get_stronger: "לעלות במסת שריר",

    cut: "לרדת באחוזי שומן ולהתחטב",
    fat_loss: "לרדת באחוזי שומן ולהתחטב",
    lose_weight: "לרדת באחוזי שומן ולהתחטב",

    maintain: "לשפר הרגלים ולשמור על הגוף",
    maintenance: "לשפר הרגלים ולשמור על הגוף",
  };

  return map[v] ?? "—";
}
