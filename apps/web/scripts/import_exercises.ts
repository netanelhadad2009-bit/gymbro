/**
 * 🏋️‍♂️ GymBro Exercise Library Import Script
 *
 * Imports exercises from exercises_library.json into Supabase database
 * - Validates all required fields
 * - Checks for duplicates (idempotent)
 * - Batch processing for performance
 * - Creates/links tags automatically
 * - Full UTF-8 Hebrew support
 *
 * Usage: pnpm import-exercises
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";

// Load environment variables from .env.local
config({ path: path.resolve(process.cwd(), ".env.local") });

// ============================================================================
// ENVIRONMENT & CONFIGURATION
// ============================================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BATCH_SIZE = 10; // Process exercises in batches to reduce API calls

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(chalk.red("❌ Missing required environment variables:"));
  console.error(chalk.red(`   NEXT_PUBLIC_SUPABASE_URL: ${!!SUPABASE_URL}`));
  console.error(chalk.red(`   SUPABASE_SERVICE_ROLE_KEY: ${!!SUPABASE_SERVICE_ROLE_KEY}`));
  console.error(chalk.yellow("\n💡 Make sure these are set in your .env.local file"));
  process.exit(1);
}

// Initialize Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface ExerciseData {
  name_he: string;
  description_he: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  sets_default: number;
  reps_default: string;
  tempo_default: string;
  rest_seconds_default: number;
  video_url?: string;
  thumb_url?: string;
  tags: string[];
}

interface ImportStats {
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  newTags: number;
  skippedNames: string[];
  failedNames: Array<{ name: string; error: string }>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Load and parse JSON file
 */
function loadExercisesFromFile(filePath: string): ExerciseData[] {
  try {
    const fullPath = path.resolve(filePath);
    console.log(chalk.blue(`📂 Loading exercises from: ${fullPath}`));

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }

    const fileContent = fs.readFileSync(fullPath, "utf-8");
    const data = JSON.parse(fileContent);

    // Handle both array and object with "exercises" key
    const exercises = Array.isArray(data) ? data : data.exercises || [];

    if (!Array.isArray(exercises) || exercises.length === 0) {
      throw new Error("No exercises found in JSON file");
    }

    console.log(chalk.green(`✅ Loaded ${exercises.length} exercises from JSON\n`));
    return exercises;
  } catch (error) {
    console.error(chalk.red("❌ Error loading file:"), error);
    throw error;
  }
}

/**
 * Validate required fields
 */
function validateExercise(exercise: ExerciseData, index: number): { valid: boolean; error?: string } {
  const required = {
    name_he: exercise.name_he,
    description_he: exercise.description_he,
    primary_muscle: exercise.primary_muscle,
    difficulty: exercise.difficulty,
    sets_default: exercise.sets_default,
    reps_default: exercise.reps_default,
  };

  for (const [field, value] of Object.entries(required)) {
    if (value === undefined || value === null || value === "") {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  const validDifficulties = ["beginner", "intermediate", "advanced"];
  if (!validDifficulties.includes(exercise.difficulty)) {
    return { valid: false, error: `Invalid difficulty: ${exercise.difficulty}` };
  }

  return { valid: true };
}

/**
 * Ensure tag exists and return its ID
 */
async function ensureTag(supabase: any, nameHe: string): Promise<string> {
  // Try to find existing tag
  const { data: existing, error: selectError } = await supabase
    .from('exercise_tags')
    .select('id')
    .eq('name_he', nameHe)
    .maybeSingle();

  if (selectError) {
    console.error(`Error selecting tag "${nameHe}":`, selectError);
    throw selectError;
  }

  if (existing) {
    return existing.id;
  }

  // Create new tag
  const { data: newTag, error: insertError } = await supabase
    .from('exercise_tags')
    .insert({ name_he: nameHe })
    .select('id')
    .single();

  if (insertError) {
    // If duplicate key error (race condition), fetch again
    if (insertError.code === '23505') {
      const { data: retryData } = await supabase
        .from('exercise_tags')
        .select('id')
        .eq('name_he', nameHe)
        .single();
      if (retryData) return retryData.id;
    }
    throw insertError;
  }

  return newTag.id;
}

/**
 * Link exercise to tag (idempotent)
 */
async function linkExerciseTag(supabase: any, exerciseId: string, tagId: string) {
  // Check if link exists
  const { data: existing } = await supabase
    .from('exercise_library_tags')
    .select('id')
    .eq('exercise_id', exerciseId)
    .eq('tag_id', tagId)
    .maybeSingle();

  if (existing) return; // Already linked

  // Create link
  const { error } = await supabase
    .from('exercise_library_tags')
    .insert({ exercise_id: exerciseId, tag_id: tagId });

  // Ignore duplicate key errors (race condition)
  if (error && error.code !== '23505') {
    throw error;
  }
}

/**
 * Insert a single exercise with its tags
 */
async function insertExercise(
  exercise: ExerciseData,
  index: number,
  stats: ImportStats
): Promise<void> {
  const displayIndex = `[${index + 1}/${stats.total}]`;
  const name = exercise.name_he;

  // Validate
  const validation = validateExercise(exercise, index);
  if (!validation.valid) {
    console.log(chalk.yellow(`${displayIndex} ${name} → ⚠️  Skipped (${validation.error})`));
    stats.skipped++;
    stats.skippedNames.push(`${name} (${validation.error})`);
    return;
  }

  try {
    // Check if exists and get ID
    const { data: existingExercise } = await supabase
      .from("exercise_library")
      .select("id")
      .eq("name_he", name)
      .maybeSingle();

    let exerciseId: string;
    let wasInserted = false;

    if (existingExercise) {
      // Exercise exists - use its ID
      exerciseId = existingExercise.id;
    } else {
      // Insert new exercise
      const { data: exerciseData, error: exerciseError } = await supabase
        .from("exercise_library")
        .insert({
          name_he: exercise.name_he,
          description_he: exercise.description_he || null,
          primary_muscle: exercise.primary_muscle || null,
          secondary_muscles: exercise.secondary_muscles || [],
          equipment: exercise.equipment || null,
          difficulty: exercise.difficulty || "beginner",
          sets_default: exercise.sets_default || null,
          reps_default: exercise.reps_default || null,
          tempo_default: exercise.tempo_default || null,
          rest_seconds_default: exercise.rest_seconds_default || null,
          video_url: exercise.video_url || null,
          thumb_url: exercise.thumb_url || null,
          is_active: true,
          created_by: null, // System import
        })
        .select("id")
        .single();

      if (exerciseError || !exerciseData) {
        throw new Error(exerciseError?.message || "Failed to insert exercise");
      }

      exerciseId = exerciseData.id;
      wasInserted = true;
    }

    // Process tags using UPSERT (for both new and existing exercises)
    if (Array.isArray(exercise.tags)) {
      for (const tag of exercise.tags) {
        const tagId = await ensureTag(supabase, tag);
        await linkExerciseTag(supabase, exerciseId, tagId);
      }
    }

    if (wasInserted) {
      console.log(chalk.green(`${displayIndex} ${name} → ✅ Inserted`));
      stats.imported++;
    } else {
      console.log(chalk.gray(`${displayIndex} ${name} → 🔄 Updated tags`));
      stats.skipped++;
      stats.skippedNames.push(`${name} (tags updated)`);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : JSON.stringify(error, null, 2);
    console.error(chalk.red(`${displayIndex} ${name} → ❌ Failed: ${errorMsg}`));
    stats.failed++;
    stats.failedNames.push({ name, error: errorMsg });
  }
}

/**
 * Process exercises in batches
 */
async function processBatch(
  batch: ExerciseData[],
  startIndex: number,
  stats: ImportStats
): Promise<void> {
  const promises = batch.map((exercise, i) =>
    insertExercise(exercise, startIndex + i, stats)
  );

  await Promise.all(promises);
}

// ============================================================================
// MAIN IMPORT FUNCTION
// ============================================================================

async function importExercises(filePath: string): Promise<void> {
  console.log(chalk.bold.cyan("\n🏋️‍♂️  GymBro Exercise Import Started\n"));
  console.log(chalk.gray("=".repeat(60)) + "\n");

  const stats: ImportStats = {
    total: 0,
    imported: 0,
    skipped: 0,
    failed: 0,
    newTags: 0,
    skippedNames: [],
    failedNames: [],
  };

  try {
    // Load exercises
    const exercises = loadExercisesFromFile(filePath);
    stats.total = exercises.length;

    // Count initial tags
    const { count: initialTagCount } = await supabase
      .from("exercise_tags")
      .select("*", { count: "exact", head: true });

    console.log(chalk.blue("🔄 Processing exercises...\n"));

    // Process in batches for better performance
    for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
      const batch = exercises.slice(i, Math.min(i + BATCH_SIZE, exercises.length));
      await processBatch(batch, i, stats);
    }

    // Count final tags
    const { count: finalTagCount } = await supabase
      .from("exercise_tags")
      .select("*", { count: "exact", head: true });

    stats.newTags = (finalTagCount || 0) - (initialTagCount || 0);

    // Print Summary
    console.log("\n" + chalk.gray("=".repeat(60)));
    console.log(chalk.bold.cyan("📊 Summary"));
    console.log(chalk.gray("=".repeat(60)));
    console.log(chalk.green(`✅ Imported: ${stats.imported}`));
    console.log(chalk.gray(`⏭️  Skipped: ${stats.skipped}`));
    console.log(chalk.red(`❌ Failed: ${stats.failed}`));
    console.log(chalk.yellow(`🏷️  New tags created: ${stats.newTags}`));
    console.log(chalk.gray("=".repeat(60)) + "\n");

    // Show skipped exercises if any
    if (stats.skippedNames.length > 0 && stats.skippedNames.length <= 10) {
      console.log(chalk.gray("⏭️  Skipped Exercises:"));
      stats.skippedNames.forEach((name) => console.log(chalk.gray(`   - ${name}`)));
      console.log();
    }

    // Show failed exercises if any
    if (stats.failedNames.length > 0) {
      console.log(chalk.red("❌ Failed Exercises:"));
      stats.failedNames.forEach(({ name, error }) => {
        console.log(chalk.red(`   - ${name}: ${error}`));
      });
      console.log();
    }

    // Preview imported exercises
    if (stats.imported > 0) {
      console.log(chalk.blue("📝 Preview of Imported Exercises (first 3):"));
      const { data: preview } = await supabase
        .from("exercise_library")
        .select("id, name_he, primary_muscle, difficulty, sets_default, reps_default")
        .order("created_at", { ascending: false })
        .limit(3);

      if (preview) {
        preview.forEach((ex) => {
          console.log(chalk.white(`   - ${ex.name_he}`));
          console.log(chalk.gray(`     שריר: ${ex.primary_muscle} | קושי: ${ex.difficulty}`));
          console.log(chalk.gray(`     ברירת מחדל: ${ex.sets_default} × ${ex.reps_default}`));
          console.log(chalk.gray(`     ID: ${ex.id}`));
          console.log();
        });
      }
    }

    console.log(chalk.bold.green("✨ Import complete!\n"));

    // Exit with error code if there were failures
    if (stats.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red("\n❌ Import failed with error:"));
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

const filePath = process.argv[2] || "./data/exercises_library.json";
importExercises(filePath);
