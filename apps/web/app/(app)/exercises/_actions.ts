"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  ExerciseSchema,
  ExerciseInput,
  ExerciseWithTags,
  ExerciseFilters,
  BulkExerciseSchema,
  CSVExerciseSchema,
  csvRowToExerciseInput,
} from "@/lib/schemas/exercise";
import { revalidatePath } from "next/cache";
import Papa from "papaparse";

// Helper: Check if user is admin
async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("לא מחובר");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    throw new Error("אין הרשאות מנהל");
  }

  return { user, supabase };
}

// Helper: Create or get tag ID
async function getOrCreateTag(supabase: any, tagName: string): Promise<string> {
  // Try to find existing tag
  const { data: existingTag } = await supabase
    .from("exercise_tags")
    .select("id")
    .eq("name_he", tagName)
    .single();

  if (existingTag) {
    return existingTag.id;
  }

  // Create new tag
  const { data: newTag, error } = await supabase
    .from("exercise_tags")
    .insert({ name_he: tagName })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating tag:", error);
    throw new Error(`שגיאה ביצירת תג: ${tagName}`);
  }

  return newTag.id;
}

/**
 * Create a new exercise
 */
export async function createExercise(data: ExerciseInput): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { user, supabase } = await verifyAdmin();

    // Validate input
    const validated = ExerciseSchema.parse(data);

    // Insert exercise
    const { data: exercise, error: insertError } = await supabase
      .from("exercise_library")
      .insert({
        name_he: validated.name_he,
        description_he: validated.description_he || null,
        primary_muscle: validated.primary_muscle || null,
        secondary_muscles: validated.secondary_muscles || [],
        equipment: validated.equipment || null,
        difficulty: validated.difficulty,
        sets_default: validated.sets_default || null,
        reps_default: validated.reps_default || null,
        tempo_default: validated.tempo_default || null,
        rest_seconds_default: validated.rest_seconds_default || null,
        video_url: validated.video_url || null,
        thumb_url: validated.thumb_url || null,
        is_active: validated.is_active,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert exercise error:", insertError);
      return { success: false, error: insertError.message };
    }

    // Handle tags
    if (validated.tags && validated.tags.length > 0) {
      const tagPromises = validated.tags.map((tagName: string) => getOrCreateTag(supabase, tagName));
      const tagIds = await Promise.all(tagPromises);

      const tagLinks = tagIds.map((tagId: string) => ({
        exercise_id: exercise.id,
        tag_id: tagId,
      }));

      const { error: tagError } = await supabase
        .from("exercise_library_tags")
        .insert(tagLinks);

      if (tagError) {
        console.error("Tag linking error:", tagError);
        // Don't fail the whole operation if tags fail
      }
    }

    revalidatePath("/exercises");
    revalidatePath("/exercises/admin");

    return { success: true, id: exercise.id };
  } catch (error) {
    console.error("Create exercise error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/**
 * Update an existing exercise
 */
export async function updateExercise(
  id: string,
  data: ExerciseInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdmin();

    // Validate input
    const validated = ExerciseSchema.parse(data);

    // Update exercise
    const { error: updateError } = await supabase
      .from("exercise_library")
      .update({
        name_he: validated.name_he,
        description_he: validated.description_he || null,
        primary_muscle: validated.primary_muscle || null,
        secondary_muscles: validated.secondary_muscles || [],
        equipment: validated.equipment || null,
        difficulty: validated.difficulty,
        sets_default: validated.sets_default || null,
        reps_default: validated.reps_default || null,
        tempo_default: validated.tempo_default || null,
        rest_seconds_default: validated.rest_seconds_default || null,
        video_url: validated.video_url || null,
        thumb_url: validated.thumb_url || null,
        is_active: validated.is_active,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Update exercise error:", updateError);
      return { success: false, error: updateError.message };
    }

    // Update tags: delete existing and recreate
    await supabase
      .from("exercise_library_tags")
      .delete()
      .eq("exercise_id", id);

    if (validated.tags && validated.tags.length > 0) {
      const tagPromises = validated.tags.map((tagName: string) => getOrCreateTag(supabase, tagName));
      const tagIds = await Promise.all(tagPromises);

      const tagLinks = tagIds.map((tagId: string) => ({
        exercise_id: id,
        tag_id: tagId,
      }));

      await supabase
        .from("exercise_library_tags")
        .insert(tagLinks);
    }

    revalidatePath("/exercises");
    revalidatePath(`/exercises/${id}`);
    revalidatePath("/exercises/admin");

    return { success: true };
  } catch (error) {
    console.error("Update exercise error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/**
 * Delete an exercise
 */
export async function deleteExercise(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from("exercise_library")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete exercise error:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/exercises");
    revalidatePath("/exercises/admin");

    return { success: true };
  } catch (error) {
    console.error("Delete exercise error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/**
 * Get all exercises with filters
 */
export async function getExercises(filters?: ExerciseFilters): Promise<ExerciseWithTags[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("exercise_library")
    .select(`
      *,
      exercise_library_tags (
        exercise_tags (
          id,
          name_he
        )
      )
    `)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters?.search) {
    query = query.ilike("name_he", `%${filters.search}%`);
  }

  if (filters?.primary_muscle) {
    query = query.eq("primary_muscle", filters.primary_muscle);
  }

  if (filters?.equipment) {
    query = query.eq("equipment", filters.equipment);
  }

  if (filters?.difficulty) {
    query = query.eq("difficulty", filters.difficulty);
  }

  if (filters?.is_active !== undefined) {
    query = query.eq("is_active", filters.is_active);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Get exercises error:", error);
    return [];
  }

  // Transform the data to match ExerciseWithTags type
  return (data || []).map((exercise: any) => ({
    ...exercise,
    tags: (exercise.exercise_library_tags || [])
      .map((elt: any) => elt.exercise_tags)
      .filter(Boolean),
  }));
}

/**
 * Get exercise by ID
 */
export async function getExerciseById(id: string): Promise<ExerciseWithTags | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("exercise_library")
    .select(`
      *,
      exercise_library_tags (
        exercise_tags (
          id,
          name_he
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("Get exercise by ID error:", error);
    return null;
  }

  return {
    ...data,
    tags: (data.exercise_library_tags || [])
      .map((elt: any) => elt.exercise_tags)
      .filter(Boolean),
  };
}

/**
 * Bulk import exercises from JSON
 */
export async function bulkImportJSON(
  jsonText: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { user, supabase } = await verifyAdmin();

    // Parse and validate JSON
    const parsed = JSON.parse(jsonText);
    const validated = BulkExerciseSchema.parse(parsed);

    let successCount = 0;

    for (const exerciseData of validated.exercises) {
      try {
        // Insert exercise
        const { data: exercise, error: insertError } = await supabase
          .from("exercise_library")
          .insert({
            name_he: exerciseData.name_he,
            description_he: exerciseData.description_he || null,
            primary_muscle: exerciseData.primary_muscle || null,
            secondary_muscles: exerciseData.secondary_muscles || [],
            equipment: exerciseData.equipment || null,
            difficulty: exerciseData.difficulty,
            sets_default: exerciseData.sets_default || null,
            reps_default: exerciseData.reps_default || null,
            tempo_default: exerciseData.tempo_default || null,
            rest_seconds_default: exerciseData.rest_seconds_default || null,
            video_url: exerciseData.video_url || null,
            thumb_url: exerciseData.thumb_url || null,
            is_active: exerciseData.is_active,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(`Error inserting ${exerciseData.name_he}:`, insertError);
          continue;
        }

        // Handle tags
        if (exerciseData.tags && exerciseData.tags.length > 0) {
          const tagPromises = exerciseData.tags.map((tagName: string) => getOrCreateTag(supabase, tagName));
          const tagIds = await Promise.all(tagPromises);

          const tagLinks = tagIds.map((tagId: string) => ({
            exercise_id: exercise.id,
            tag_id: tagId,
          }));

          await supabase
            .from("exercise_library_tags")
            .insert(tagLinks);
        }

        successCount++;
      } catch (itemError) {
        console.error(`Error processing ${exerciseData.name_he}:`, itemError);
      }
    }

    revalidatePath("/exercises");
    revalidatePath("/exercises/admin");

    return {
      success: true,
      count: successCount,
    };
  } catch (error) {
    console.error("Bulk import JSON error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/**
 * Bulk import exercises from CSV
 */
export async function bulkImportCSV(
  csvText: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const { user, supabase } = await verifyAdmin();

    // Parse CSV
    const parseResult = Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";", // Support semicolon as specified
    });

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        error: `שגיאת ניתוח CSV: ${parseResult.errors[0].message}`,
      };
    }

    let successCount = 0;

    for (const row of parseResult.data) {
      try {
        // Validate and convert CSV row
        const csvRow = CSVExerciseSchema.parse(row);
        const exerciseData = csvRowToExerciseInput(csvRow);

        // Insert exercise
        const { data: exercise, error: insertError } = await supabase
          .from("exercise_library")
          .insert({
            name_he: exerciseData.name_he,
            description_he: exerciseData.description_he || null,
            primary_muscle: exerciseData.primary_muscle || null,
            secondary_muscles: exerciseData.secondary_muscles || [],
            equipment: exerciseData.equipment || null,
            difficulty: exerciseData.difficulty,
            sets_default: exerciseData.sets_default || null,
            reps_default: exerciseData.reps_default || null,
            tempo_default: exerciseData.tempo_default || null,
            rest_seconds_default: exerciseData.rest_seconds_default || null,
            video_url: exerciseData.video_url || null,
            thumb_url: exerciseData.thumb_url || null,
            is_active: exerciseData.is_active,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(`Error inserting ${exerciseData.name_he}:`, insertError);
          continue;
        }

        // Handle tags
        if (exerciseData.tags && exerciseData.tags.length > 0) {
          const tagPromises = exerciseData.tags.map((tagName: string) => getOrCreateTag(supabase, tagName));
          const tagIds = await Promise.all(tagPromises);

          const tagLinks = tagIds.map((tagId: string) => ({
            exercise_id: exercise.id,
            tag_id: tagId,
          }));

          await supabase
            .from("exercise_library_tags")
            .insert(tagLinks);
        }

        successCount++;
      } catch (itemError) {
        console.error(`Error processing row:`, itemError);
      }
    }

    revalidatePath("/exercises");
    revalidatePath("/exercises/admin");

    return {
      success: true,
      count: successCount,
    };
  } catch (error) {
    console.error("Bulk import CSV error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/**
 * Get all tags
 */
export async function getAllTags() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("exercise_tags")
    .select("*")
    .order("name_he");

  if (error) {
    console.error("Get tags error:", error);
    return [];
  }

  return data || [];
}

/**
 * Check if current user is admin
 */
export async function checkIsAdmin(): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    return profile?.is_admin || false;
  } catch {
    return false;
  }
}
