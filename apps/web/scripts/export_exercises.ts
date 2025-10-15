/**
 * 🏋️‍♂️ GymBro Exercise Catalog Export Script
 *
 * Exports all exercises from Supabase to a structured JSON catalog
 * - Includes all exercise metadata with Hebrew text support
 * - Fetches and joins tags from exercise_tags table
 * - Builds fast lookup indexes (by ID, slug, muscle, equipment)
 * - Generates both pretty and minified versions
 * - Provides detailed statistics and summaries
 *
 * Usage: pnpm export-exercises
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
const PAGE_SIZE = 1000; // Fetch exercises in chunks to handle large catalogs
const OUTPUT_DIR = "./data";
const OUTPUT_FILE = "exercises_catalog.json";
const OUTPUT_FILE_MIN = "exercises_catalog.min.json";

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

interface ExportExercise {
  id: string;
  slug: string;
  name_he: string;
  description_he?: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  primary_muscle?: string | null;
  secondary_muscles: string[];
  equipment?: string | null;
  defaults: {
    sets?: number | null;
    reps?: string | null;
    tempo?: string | null;
    rest_seconds?: number | null;
  };
  media: {
    video_url?: string | null;
    thumb_url?: string | null;
  };
  tags: string[];
  created_at: string;
  updated_at?: string | null;
}

interface CatalogIndexes {
  by_id: { [id: string]: number };
  by_slug: { [slug: string]: number };
  by_primary_muscle: { [muscle: string]: number[] };
  by_equipment: { [equipment: string]: number[] };
}

interface ExerciseCatalog {
  exercises: ExportExercise[];
  _index: CatalogIndexes;
}

interface DatabaseExercise {
  id: string;
  slug: string;
  name_he: string;
  description_he?: string | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  primary_muscle?: string | null;
  secondary_muscles: string[];
  equipment?: string | null;
  sets_default?: number | null;
  reps_default?: string | null;
  tempo_default?: string | null;
  rest_seconds_default?: number | null;
  video_url?: string | null;
  thumb_url?: string | null;
  created_at: string;
  updated_at?: string | null;
}

interface ExerciseTag {
  exercise_id: string;
  tag_name: string;
}

interface Stats {
  byMuscle: Map<string, number>;
  byDifficulty: Map<string, number>;
  byEquipment: Map<string, number>;
  tagUsage: Map<string, number>;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate slug from Hebrew name
 */
function generateSlug(nameHe: string, id: string): string {
  // For Hebrew text, use the ID as the slug base
  // In production, you might want to use transliteration or a proper slug library
  const cleanName = nameHe
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\u0590-\u05FF\w-]/g, '')
    .toLowerCase();

  return cleanName || id.substring(0, 8);
}

/**
 * Normalize exercise data from database format to export format
 */
function normalizeExercise(dbExercise: DatabaseExercise, tags: string[]): ExportExercise {
  return {
    id: dbExercise.id,
    slug: dbExercise.slug || generateSlug(dbExercise.name_he, dbExercise.id),
    name_he: dbExercise.name_he.trim(),
    description_he: dbExercise.description_he?.trim() || null,
    difficulty: dbExercise.difficulty || 'beginner',
    primary_muscle: dbExercise.primary_muscle?.trim() || null,
    secondary_muscles: Array.isArray(dbExercise.secondary_muscles)
      ? dbExercise.secondary_muscles.filter(Boolean).map(m => m.trim())
      : [],
    equipment: dbExercise.equipment?.trim() || null,
    defaults: {
      sets: dbExercise.sets_default || null,
      reps: dbExercise.reps_default?.trim() || null,
      tempo: dbExercise.tempo_default?.trim() || null,
      rest_seconds: dbExercise.rest_seconds_default || null,
    },
    media: {
      video_url: dbExercise.video_url?.trim() || null,
      thumb_url: dbExercise.thumb_url?.trim() || null,
    },
    tags: Array.from(new Set(tags)).sort(), // Unique and sorted
    created_at: dbExercise.created_at,
    updated_at: dbExercise.updated_at || null,
  };
}

/**
 * Sort exercises by muscle → difficulty → name
 */
function sortExercises(exercises: ExportExercise[]): ExportExercise[] {
  const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };

  return exercises.sort((a, b) => {
    // Sort by primary_muscle (nulls last)
    const muscleA = a.primary_muscle || '\uFFFF';
    const muscleB = b.primary_muscle || '\uFFFF';
    if (muscleA !== muscleB) {
      return muscleA.localeCompare(muscleB, 'he');
    }

    // Sort by difficulty
    const diffA = difficultyOrder[a.difficulty];
    const diffB = difficultyOrder[b.difficulty];
    if (diffA !== diffB) {
      return diffA - diffB;
    }

    // Sort by name_he
    return a.name_he.localeCompare(b.name_he, 'he');
  });
}

/**
 * Build lookup indexes
 */
function buildIndexes(exercises: ExportExercise[]): CatalogIndexes {
  const indexes: CatalogIndexes = {
    by_id: {},
    by_slug: {},
    by_primary_muscle: {},
    by_equipment: {},
  };

  exercises.forEach((exercise, index) => {
    // Index by ID
    indexes.by_id[exercise.id] = index;

    // Index by slug (first occurrence wins)
    if (!indexes.by_slug[exercise.slug]) {
      indexes.by_slug[exercise.slug] = index;
    }

    // Index by primary muscle
    if (exercise.primary_muscle) {
      if (!indexes.by_primary_muscle[exercise.primary_muscle]) {
        indexes.by_primary_muscle[exercise.primary_muscle] = [];
      }
      indexes.by_primary_muscle[exercise.primary_muscle].push(index);
    }

    // Index by equipment
    if (exercise.equipment) {
      if (!indexes.by_equipment[exercise.equipment]) {
        indexes.by_equipment[exercise.equipment] = [];
      }
      indexes.by_equipment[exercise.equipment].push(index);
    }
  });

  return indexes;
}

/**
 * Calculate statistics from exercises
 */
function calculateStats(exercises: ExportExercise[]): Stats {
  const stats: Stats = {
    byMuscle: new Map(),
    byDifficulty: new Map(),
    byEquipment: new Map(),
    tagUsage: new Map(),
  };

  exercises.forEach((exercise) => {
    // Count by muscle
    const muscle = exercise.primary_muscle || '(none)';
    stats.byMuscle.set(muscle, (stats.byMuscle.get(muscle) || 0) + 1);

    // Count by difficulty
    stats.byDifficulty.set(
      exercise.difficulty,
      (stats.byDifficulty.get(exercise.difficulty) || 0) + 1
    );

    // Count by equipment
    const equipment = exercise.equipment || '(none)';
    stats.byEquipment.set(equipment, (stats.byEquipment.get(equipment) || 0) + 1);

    // Count tag usage
    exercise.tags.forEach((tag) => {
      stats.tagUsage.set(tag, (stats.tagUsage.get(tag) || 0) + 1);
    });
  });

  return stats;
}

/**
 * Print statistics table
 */
function printStatsTable(title: string, stats: Map<string, number>, limit?: number) {
  console.log(chalk.bold.cyan(`\n${title}:`));
  console.log(chalk.gray("─".repeat(50)));

  const sorted = Array.from(stats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  sorted.forEach(([key, count]) => {
    const percentage = ((count / Array.from(stats.values()).reduce((a, b) => a + b, 0)) * 100).toFixed(1);
    console.log(chalk.white(`  ${key.padEnd(30)} ${chalk.green(count.toString().padStart(5))}  ${chalk.gray(`(${percentage}%)`)}`));
  });
}

// ============================================================================
// SQL SMOKE TEST QUERIES
// ============================================================================

function printSmokeTestQueries() {
  console.log(chalk.bold.cyan("\n📋 SQL Smoke Test Queries (copy-paste to run manually):"));
  console.log(chalk.gray("─".repeat(70)));
  console.log(chalk.white(`
-- Total exercises
SELECT COUNT(*) AS total FROM public.exercise_library;

-- Exercises by primary muscle
SELECT primary_muscle, COUNT(*)
FROM public.exercise_library
GROUP BY primary_muscle
ORDER BY COUNT(*) DESC NULLS LAST;

-- Exercises by difficulty
SELECT difficulty, COUNT(*)
FROM public.exercise_library
GROUP BY difficulty
ORDER BY 1;

-- Tag usage (top 15)
SELECT et.name_he, COUNT(*) AS usage_count
FROM public.exercise_tags et
LEFT JOIN public.exercise_library_tags elt ON et.id = elt.tag_id
GROUP BY et.name_he
ORDER BY usage_count DESC
LIMIT 15;
`));
  console.log(chalk.gray("─".repeat(70)));
}

// ============================================================================
// MAIN EXPORT FUNCTIONS
// ============================================================================

/**
 * Fetch all exercises from Supabase with pagination
 */
async function fetchAllExercises(): Promise<DatabaseExercise[]> {
  const allExercises: DatabaseExercise[] = [];
  let offset = 0;
  let hasMore = true;

  console.log(chalk.blue("📥 Fetching exercises from Supabase..."));

  while (hasMore) {
    const { data, error } = await supabase
      .from('exercise_library')
      .select(`
        id,
        slug,
        name_he,
        description_he,
        difficulty,
        primary_muscle,
        secondary_muscles,
        equipment,
        sets_default,
        reps_default,
        tempo_default,
        rest_seconds_default,
        video_url,
        thumb_url,
        created_at,
        updated_at
      `)
      .range(offset, offset + PAGE_SIZE - 1)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch exercises: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
      break;
    }

    allExercises.push(...data as DatabaseExercise[]);
    offset += PAGE_SIZE;

    console.log(chalk.gray(`   Fetched ${allExercises.length} exercises...`));

    if (data.length < PAGE_SIZE) {
      hasMore = false;
    }
  }

  console.log(chalk.green(`✅ Fetched ${allExercises.length} exercises total\n`));
  return allExercises;
}

/**
 * Fetch all exercise tags in bulk (avoiding N+1)
 */
async function fetchAllExerciseTags(exerciseIds: string[]): Promise<Map<string, string[]>> {
  if (exerciseIds.length === 0) {
    return new Map();
  }

  console.log(chalk.blue("🏷️  Fetching exercise tags..."));

  const tagsMap = new Map<string, string[]>();

  // Initialize all exercises with empty arrays
  exerciseIds.forEach(id => tagsMap.set(id, []));

  // Fetch all tags in bulk with join
  const { data, error } = await supabase
    .from('exercise_library_tags')
    .select(`
      exercise_id,
      exercise_tags!inner (
        name_he
      )
    `)
    .in('exercise_id', exerciseIds);

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  if (data) {
    data.forEach((row: any) => {
      const exerciseId = row.exercise_id;
      const tagName = row.exercise_tags?.name_he;

      if (exerciseId && tagName) {
        const tags = tagsMap.get(exerciseId) || [];
        tags.push(tagName);
        tagsMap.set(exerciseId, tags);
      }
    });
  }

  const totalTags = Array.from(tagsMap.values()).reduce((sum, tags) => sum + tags.length, 0);
  console.log(chalk.green(`✅ Fetched ${totalTags} tag associations\n`));

  return tagsMap;
}

/**
 * Write JSON files to disk
 */
function writeCatalogFiles(catalog: ExerciseCatalog) {
  // Ensure output directory exists
  const outputPath = path.resolve(process.cwd(), OUTPUT_DIR);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
    console.log(chalk.blue(`📁 Created directory: ${outputPath}`));
  }

  // Write pretty JSON
  const prettyPath = path.join(outputPath, OUTPUT_FILE);
  fs.writeFileSync(prettyPath, JSON.stringify(catalog, null, 2), 'utf-8');
  console.log(chalk.green(`✅ Wrote pretty JSON: ${prettyPath}`));

  // Write minified JSON
  const minPath = path.join(outputPath, OUTPUT_FILE_MIN);
  fs.writeFileSync(minPath, JSON.stringify(catalog), 'utf-8');
  console.log(chalk.green(`✅ Wrote minified JSON: ${minPath}`));

  // Print file sizes
  const prettySize = (fs.statSync(prettyPath).size / 1024).toFixed(2);
  const minSize = (fs.statSync(minPath).size / 1024).toFixed(2);
  console.log(chalk.gray(`   Pretty: ${prettySize} KB | Minified: ${minSize} KB\n`));
}

/**
 * Print summary statistics
 */
function printSummary(exercises: ExportExercise[], stats: Stats) {
  console.log(chalk.bold.cyan("\n📊 Export Summary"));
  console.log(chalk.gray("=".repeat(70)));
  console.log(chalk.white(`\n  Total exercises: ${chalk.green(exercises.length.toString())}`));

  // By muscle
  printStatsTable("By Primary Muscle", stats.byMuscle);

  // By difficulty
  printStatsTable("By Difficulty", stats.byDifficulty);

  // By equipment (top 10)
  printStatsTable("By Equipment (Top 10)", stats.byEquipment, 10);

  // Top tags
  printStatsTable("Top 10 Tags", stats.tagUsage, 10);

  console.log(chalk.gray("\n" + "=".repeat(70)));
}

/**
 * Main export function
 */
async function exportExerciseCatalog(): Promise<void> {
  console.log(chalk.bold.cyan("\n🏋️‍♂️  GymBro Exercise Catalog Export Started\n"));
  console.log(chalk.gray("=".repeat(70)) + "\n");

  try {
    // Step 1: Fetch all exercises
    const dbExercises = await fetchAllExercises();

    if (dbExercises.length === 0) {
      console.log(chalk.yellow("⚠️  No exercises found in database"));
      return;
    }

    // Step 2: Fetch all tags (bulk query to avoid N+1)
    const exerciseIds = dbExercises.map(ex => ex.id);
    const tagsMap = await fetchAllExerciseTags(exerciseIds);

    // Step 3: Normalize exercises
    console.log(chalk.blue("🔄 Normalizing exercise data..."));
    const exercises = dbExercises.map(dbEx => {
      const tags = tagsMap.get(dbEx.id) || [];
      return normalizeExercise(dbEx, tags);
    });
    console.log(chalk.green("✅ Normalized all exercises\n"));

    // Step 4: Sort exercises
    console.log(chalk.blue("🔄 Sorting exercises..."));
    const sortedExercises = sortExercises(exercises);
    console.log(chalk.green("✅ Sorted by muscle → difficulty → name\n"));

    // Step 5: Build indexes
    console.log(chalk.blue("🔄 Building lookup indexes..."));
    const indexes = buildIndexes(sortedExercises);
    console.log(chalk.green(`✅ Built indexes (${Object.keys(indexes.by_id).length} IDs, ${Object.keys(indexes.by_slug).length} slugs)\n`));

    // Step 6: Create catalog
    const catalog: ExerciseCatalog = {
      exercises: sortedExercises,
      _index: indexes,
    };

    // Step 7: Write files
    console.log(chalk.blue("💾 Writing catalog files..."));
    writeCatalogFiles(catalog);

    // Step 8: Calculate and print statistics
    const stats = calculateStats(sortedExercises);
    printSummary(sortedExercises, stats);

    // Step 9: Print SQL smoke test queries
    printSmokeTestQueries();

    console.log(chalk.bold.green("\n✨ Export complete!\n"));

  } catch (error) {
    console.error(chalk.red("\n❌ Export failed with error:"));
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

exportExerciseCatalog();
