import { z } from "zod";

// Exercise difficulty levels
export const DifficultyEnum = z.enum(["beginner", "intermediate", "advanced"]);
export type Difficulty = z.infer<typeof DifficultyEnum>;

// Primary muscle groups (Hebrew)
export const PrimaryMuscleOptions = [
  "חזה",
  "גב",
  "רגליים",
  "כתפיים",
  "יד קדמית",
  "יד אחורית",
  "בטן",
  "כללי",
] as const;

// Equipment types (Hebrew)
export const EquipmentOptions = [
  "משקולות",
  "מוט",
  "מכונה",
  "משקל גוף",
  "כבלים",
  "קטלבל",
  "רצועות התנגדות",
  "אחר",
] as const;

// Main exercise schema for create/update
export const ExerciseSchema = z.object({
  name_he: z.string().min(2, "שם התרגיל חייב להכיל לפחות 2 תווים"),
  description_he: z.string().min(10, "תיאור התרגיל חייב להכיל לפחות 10 תווים").optional().nullable(),
  primary_muscle: z.string().optional().nullable(),
  secondary_muscles: z.array(z.string()).optional().default([]),
  equipment: z.string().optional().nullable(),
  difficulty: DifficultyEnum.default("beginner"),
  sets_default: z.number().int().positive("מספר סטים חייב להיות חיובי").optional().nullable(),
  reps_default: z.string().optional().nullable(),
  tempo_default: z.string().optional().nullable(),
  rest_seconds_default: z.number().int().positive("זמן מנוחה חייב להיות חיובי").optional().nullable(),
  video_url: z.string().url("כתובת וידאו לא תקינה").optional().nullable().or(z.literal("")),
  thumb_url: z.string().url("כתובת תמונה לא תקינה").optional().nullable().or(z.literal("")),
  is_active: z.boolean().default(true),
  tags: z.array(z.string()).optional().default([]),
});

export type ExerciseInput = z.infer<typeof ExerciseSchema>;

// Database row type
export interface ExerciseRow {
  id: string;
  slug: string | null;
  name_he: string;
  description_he: string | null;
  primary_muscle: string | null;
  secondary_muscles: string[];
  equipment: string | null;
  difficulty: Difficulty;
  sets_default: number | null;
  reps_default: string | null;
  tempo_default: string | null;
  rest_seconds_default: number | null;
  video_url: string | null;
  thumb_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Exercise with tags (joined data)
export interface ExerciseWithTags extends ExerciseRow {
  tags: Array<{
    id: string;
    name_he: string;
  }>;
}

// Tag schema
export const TagSchema = z.object({
  name_he: z.string().min(1, "שם התג חייב להכיל לפחות תו אחד"),
});

export type TagInput = z.infer<typeof TagSchema>;

export interface TagRow {
  id: string;
  name_he: string;
  created_at: string;
}

// Bulk import schemas
export const BulkExerciseSchema = z.object({
  exercises: z.array(ExerciseSchema),
});

export type BulkExerciseInput = z.infer<typeof BulkExerciseSchema>;

// CSV import schema (for parsing)
export const CSVExerciseSchema = z.object({
  name_he: z.string(),
  description_he: z.string().optional().default(""),
  primary_muscle: z.string().optional().default(""),
  secondary_muscles: z.string().optional().default(""), // pipe-separated
  equipment: z.string().optional().default(""),
  difficulty: z.string().optional().default("beginner"),
  sets_default: z.string().optional().default(""),
  reps_default: z.string().optional().default(""),
  tempo_default: z.string().optional().default(""),
  rest_seconds_default: z.string().optional().default(""),
  video_url: z.string().optional().default(""),
  thumb_url: z.string().optional().default(""),
  tags: z.string().optional().default(""), // pipe-separated
});

// Helper function to convert CSV row to ExerciseInput
export function csvRowToExerciseInput(csvRow: z.infer<typeof CSVExerciseSchema>): ExerciseInput {
  return {
    name_he: csvRow.name_he,
    description_he: csvRow.description_he || null,
    primary_muscle: csvRow.primary_muscle || null,
    secondary_muscles: csvRow.secondary_muscles
      ? csvRow.secondary_muscles.split("|").map((s) => s.trim()).filter(Boolean)
      : [],
    equipment: csvRow.equipment || null,
    difficulty: (csvRow.difficulty as Difficulty) || "beginner",
    sets_default: csvRow.sets_default ? parseInt(csvRow.sets_default, 10) : null,
    reps_default: csvRow.reps_default || null,
    tempo_default: csvRow.tempo_default || null,
    rest_seconds_default: csvRow.rest_seconds_default ? parseInt(csvRow.rest_seconds_default, 10) : null,
    video_url: csvRow.video_url || null,
    thumb_url: csvRow.thumb_url || null,
    is_active: true,
    tags: csvRow.tags
      ? csvRow.tags.split("|").map((s) => s.trim()).filter(Boolean)
      : [],
  };
}

// Filter options for browse/search
export interface ExerciseFilters {
  search?: string;
  primary_muscle?: string;
  equipment?: string;
  difficulty?: Difficulty;
  tags?: string[];
  is_active?: boolean;
}
