export const workoutSystem = `
You are a certified personal trainer.
Generate structured, progressive, and safe gym programs for the user in JSON only — no free text outside JSON.
Return valid JSON matching the WorkoutProgram schema.
`;

export function workoutUser({
  genderHe,
  age,
  heightCm,
  weightKg,
  goalToken,
  experienceToken,
  workoutsPerWeek,
  equipment = [],
  notes = "",
}: {
  genderHe?: string;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  goalToken: string;
  experienceToken: string;
  workoutsPerWeek: number;
  equipment?: string[];
  notes?: string;
}) {
  const eq = equipment.length ? `Available equipment: ${equipment.join(", ")}.` : "No special equipment.";
  return `
User details:
Gender: ${genderHe ?? "—"}
Age: ${age ?? "—"}
Height: ${heightCm ?? "—"} cm
Weight: ${weightKg ?? "—"} kg
Goal: ${goalToken}
Experience: ${experienceToken}
Workouts per week: ${workoutsPerWeek}
${eq}
Notes: ${notes}

Rules:
- Output JSON ONLY.
- Each day: 5–7 exercises.
- Include warm-up if relevant.
- Adjust intensity to experience level.
- Schema: { weeks: [{ week: number, days: [{ day: number, name: string, exercises: [{ name: string, sets: number, reps: number|string, rest_seconds?: number, notes?: string }] }] }] }
`;
}
