import { createServerSupabaseClient } from "@/lib/supabase-server";

export type AssignedCoach = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  active: boolean;
};

/**
 * Get the assigned coach for a user
 */
export async function getAssignedCoach(userId: string): Promise<AssignedCoach | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("coach_clients")
    .select(`
      coach:coaches(
        id,
        display_name,
        avatar_url,
        active
      )
    `)
    .eq("client_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No assignment found
      return null;
    }
    console.error("[getAssignedCoach] Error:", error);
    return null;
  }

  if (!data || !data.coach) {
    return null;
  }

  return data.coach as unknown as AssignedCoach;
}

/**
 * Dev only: Ensure user has a mock coach assigned
 * Only runs when NEXT_PUBLIC_DEV_COACH=1 or forceChat param is set
 */
export async function ensureDevMockCoach(userId: string): Promise<AssignedCoach | null> {
  // Only in development
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_DEV_COACH !== "1") {
    console.warn("[ensureDevMockCoach] Called in production, ignoring");
    return null;
  }

  const supabase = await createServerSupabaseClient();

  try {
    // Call the database function to get or create dev coach
    const { data, error } = await supabase.rpc("get_or_create_dev_coach", {
      p_user_id: userId,
    });

    if (error) {
      console.error("[ensureDevMockCoach] RPC error:", error);
      return null;
    }

    const coachId = data as string;

    // Fetch the coach details
    const { data: coach, error: coachError } = await supabase
      .from("coaches")
      .select("id, display_name, avatar_url, active")
      .eq("id", coachId)
      .single();

    if (coachError) {
      console.error("[ensureDevMockCoach] Coach fetch error:", coachError);
      return null;
    }

    if (process.env.NEXT_PUBLIC_LOG_CHAT === "1") {
      console.log("[ensureDevMockCoach] Mock coach assigned:", coach);
    }

    return coach as AssignedCoach;
  } catch (error) {
    console.error("[ensureDevMockCoach] Error:", error);
    return null;
  }
}
