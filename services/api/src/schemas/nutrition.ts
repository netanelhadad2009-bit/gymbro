/**
 * Zod schema for nutrition plan validation
 * Enforces strict structure for 1-day kosher nutrition plans
 */

import { z } from "zod";

// CSV regex: "item, item, item" (no periods allowed)
const COMMA_SEPARATED_REGEX = /^[^.]+(?:,\s+[^.]+)*$/;

const MetaSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD format"),
  days: z.literal(1),
  goal: z.enum(["gain", "loss", "muscle", "fat_loss"]),
  activity_level: z.enum(["beginner", "intermediate", "advanced"]),
  calories_target: z.number().int().positive(),
  protein_target_g: z.number().int().nonnegative(),
  carbs_target_g: z.number().int().nonnegative(),
  fat_target_g: z.number().int().nonnegative()
});

const MealSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Day must be YYYY-MM-DD format"),
  order: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  title: z.enum([
    "ארוחת בוקר",
    "ארוחת ביניים",
    "ארוחת צהריים",
    "ארוחת ביניים",
    "ארוחת ערב"
  ]),
  time: z.string().regex(/^\d{2}:\d{2}–\d{2}:\d{2}$/, "Time must be in HH:MM–HH:MM format"),
  desc: z.string().regex(COMMA_SEPARATED_REGEX, "Description must be comma+space separated items, no periods"),
  kcal: z.number().int().positive(),
  protein_g: z.number().int().nonnegative(),
  carbs_g: z.number().int().nonnegative(),
  fat_g: z.number().int().nonnegative()
});

export const NutritionPlanSchema = z.object({
  meta: MetaSchema,
  meals_flat: z.array(MealSchema).length(5, "Must have exactly 5 meals")
});

export type NutritionPlan = z.infer<typeof NutritionPlanSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type Meta = z.infer<typeof MetaSchema>;
