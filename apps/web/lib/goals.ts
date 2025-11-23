// apps/web/lib/goals.ts
export type GoalCode =
  | "gain" | "muscle_gain"
  | "loss" | "weight_loss"
  | "recomp" | "body_maintenance"
  | string | null | undefined;

export function getGoalLabelHe(goal: GoalCode): string | null {
  if (!goal) return null;
  const g = String(goal).toLowerCase().trim();
  const map: Record<string, string> = {
    gain: "לעלות במסת שריר",
    muscle_gain: "לעלות במסת שריר",
    loss: "לרדת באחוזי שומן ולהתחטב",
    weight_loss: "לרדת באחוזי שומן ולהתחטב",
    maintain: "לשפר הרגלים ולשמור על הגוף",
    recomp: "לשפר הרגלים ולשמור על הגוף",
    body_maintenance: "לשפר הרגלים ולשמור על הגוף",
  };
  return map[g] ?? null;
}
