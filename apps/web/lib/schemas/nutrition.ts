import { z } from "zod";

/**
 * Strict validation schema for nutrition plans.
 * All numbers must be finite, non-negative, and safe.
 * No null values allowed - use empty strings/arrays instead.
 */

export const MealItem = z.object({
  food: z.string().min(1, "Food name is required"),
  amount_g: z.number().finite().min(0, "Amount must be non-negative"),
  notes: z.string().default(""),
});

export const Meal = z.object({
  name: z.enum(["Breakfast", "Snack", "Lunch", "Dinner"], {
    message: "Meal name must be one of: Breakfast, Snack, Lunch, Dinner",
  }),
  items: z.array(MealItem).min(1, "Each meal must have at least one item"),
  macros: z.object({
    calories: z.number().int().finite().min(0, "Calories must be a non-negative integer"),
    protein_g: z.number().finite().min(0, "Protein must be non-negative"),
    carbs_g: z.number().finite().min(0, "Carbs must be non-negative"),
    fat_g: z.number().finite().min(0, "Fat must be non-negative"),
  }),
  prep: z.string().default(""),
  swaps: z.array(z.object({
    option: z.string().min(1, "Swap option name is required"),
    equivalence_note: z.string().default(""),
  })).default([]),
});

export const DayPlan = z.object({
  day: z.number().int().min(1, "Day must be at least 1").max(365, "Day cannot exceed 365"),
  meals: z.array(Meal).min(3, "Each day must have at least 3 meals"),
});

export const NutritionPlan = z.object({
  summary: z.string().min(1, "Summary is required"),
  dailyTargets: z.object({
    calories: z.number().int().finite().min(1, "Calories must be a positive integer"),
    protein_g: z.number().finite().min(0, "Protein must be non-negative"),
    carbs_g: z.number().finite().min(0, "Carbs must be non-negative"),
    fat_g: z.number().finite().min(0, "Fat must be non-negative"),
    fiber_g: z.number().finite().min(0, "Fiber must be non-negative").default(25),
    water_l: z.number().finite().min(0, "Water must be non-negative").default(2),
  }),
  days: z.array(DayPlan).min(1, "Plan must have at least 1 day"),
  shoppingList: z.array(z.object({
    item: z.string().min(1, "Shopping item name is required"),
    quantity: z.number().finite().min(1, "Quantity must be positive"),
    unit: z.enum(["g", "ml", "pcs"], {
      message: "Unit must be one of: g, ml, pcs",
    }),
  })).default([]),
  tips: z.array(z.string()).default([]),
});

export type MealItemT = z.infer<typeof MealItem>;
export type MealT = z.infer<typeof Meal>;
export type DayPlanT = z.infer<typeof DayPlan>;
export type NutritionPlanT = z.infer<typeof NutritionPlan>;
