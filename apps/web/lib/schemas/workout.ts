import { z } from "zod";

export const Exercise = z.object({
  name: z.string(),
  sets: z.number().int().positive(),
  reps: z.union([z.number(), z.string()]),
  rest_seconds: z.number().nullable().optional(),
  notes: z.string().optional(),
});

export const DayPlan = z.object({
  day: z.number(),
  name: z.string(),
  exercises: z.array(Exercise).min(1),
});

export const WorkoutProgram = z.object({
  weeks: z.array(
    z.object({
      week: z.number(),
      days: z.array(DayPlan).min(3),
    })
  ),
});

export type ExerciseT = z.infer<typeof Exercise>;
export type DayPlanT = z.infer<typeof DayPlan>;
export type WorkoutProgramT = z.infer<typeof WorkoutProgram>;
