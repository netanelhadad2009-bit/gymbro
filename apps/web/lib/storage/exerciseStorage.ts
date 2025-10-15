"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload exercise video to Supabase Storage (private bucket with signed URLs)
 * @param file - Video file to upload
 * @param exerciseId - Unique exercise ID for file naming
 * @returns Upload result with signed URL (1 hour expiry)
 */
export async function uploadExerciseVideo(
  file: File,
  exerciseId: string
): Promise<UploadResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "לא מחובר" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return { success: false, error: "אין הרשאות מנהל" };
    }

    // Generate unique file name
    const fileExt = file.name.split(".").pop();
    const fileName = `${exerciseId}-${Date.now()}.${fileExt}`;
    const filePath = `videos/${fileName}`;

    // Convert File to ArrayBuffer then to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to private bucket
    const { error: uploadError } = await supabase.storage
      .from("exercise-videos")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Video upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Generate signed URL (1 hour expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("exercise-videos")
      .createSignedUrl(filePath, 3600); // 1 hour

    if (signedUrlError || !signedUrlData) {
      console.error("Signed URL error:", signedUrlError);
      return { success: false, error: "שגיאה ביצירת קישור לוידאו" };
    }

    return {
      success: true,
      url: signedUrlData.signedUrl,
    };
  } catch (error) {
    console.error("Upload video error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/**
 * Upload exercise thumbnail to Supabase Storage (public bucket)
 * @param file - Image file to upload
 * @param exerciseId - Unique exercise ID for file naming
 * @returns Upload result with public URL
 */
export async function uploadExerciseThumbnail(
  file: File,
  exerciseId: string
): Promise<UploadResult> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "לא מחובר" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return { success: false, error: "אין הרשאות מנהל" };
    }

    // Generate unique file name
    const fileExt = file.name.split(".").pop();
    const fileName = `${exerciseId}-${Date.now()}.${fileExt}`;
    const filePath = `thumbs/${fileName}`;

    // Convert File to ArrayBuffer then to Uint8Array
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Upload to public bucket
    const { error: uploadError } = await supabase.storage
      .from("exercise-thumbs")
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Thumbnail upload error:", uploadError);
      return { success: false, error: uploadError.message };
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("exercise-thumbs")
      .getPublicUrl(filePath);

    if (!publicUrlData) {
      return { success: false, error: "שגיאה ביצירת קישור לתמונה" };
    }

    return {
      success: true,
      url: publicUrlData.publicUrl,
    };
  } catch (error) {
    console.error("Upload thumbnail error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/**
 * Delete exercise video from storage
 * @param videoUrl - Full video URL to delete
 */
export async function deleteExerciseVideo(videoUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "לא מחובר" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return { success: false, error: "אין הרשאות מנהל" };
    }

    // Extract file path from URL
    const urlParts = videoUrl.split("/");
    const fileIndex = urlParts.findIndex(part => part === "exercise-videos");
    if (fileIndex === -1) {
      return { success: false, error: "כתובת לא תקינה" };
    }

    const filePath = urlParts.slice(fileIndex + 1).join("/");

    const { error } = await supabase.storage
      .from("exercise-videos")
      .remove([filePath]);

    if (error) {
      console.error("Delete video error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete video error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}

/**
 * Delete exercise thumbnail from storage
 * @param thumbUrl - Full thumbnail URL to delete
 */
export async function deleteExerciseThumbnail(thumbUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "לא מחובר" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return { success: false, error: "אין הרשאות מנהל" };
    }

    // Extract file path from URL
    const urlParts = thumbUrl.split("/");
    const fileIndex = urlParts.findIndex(part => part === "exercise-thumbs");
    if (fileIndex === -1) {
      return { success: false, error: "כתובת לא תקינה" };
    }

    const filePath = urlParts.slice(fileIndex + 1).join("/");

    const { error } = await supabase.storage
      .from("exercise-thumbs")
      .remove([filePath]);

    if (error) {
      console.error("Delete thumbnail error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Delete thumbnail error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה לא צפויה",
    };
  }
}
