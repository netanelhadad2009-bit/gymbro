import { createServerSupabaseClient } from "@/lib/supabase-server";
import type {
  Coach,
  CoachAssignment,
  CoachSession,
  CoachTaskWithCompletion,
  Checkin,
  CoachMessage,
  GetCoachProfileResponse,
} from "@/lib/schemas/coach";

/**
 * Get the active coach assignment for a user
 */
export async function getActiveAssignment(userId: string): Promise<CoachAssignment | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("coach_assignments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error) {
    // PGRST116 = No rows found - this is a valid case (user has no coach)
    if (error.code === "PGRST116") {
      return null;
    }
    // For other errors, log and return null gracefully
    console.error("[getActiveAssignment] Error:", error);
    return null;
  }

  return data as CoachAssignment;
}

/**
 * Get coach profile for an assignment
 */
export async function getCoachProfile(assignmentId: string): Promise<GetCoachProfileResponse | null> {
  const supabase = await createServerSupabaseClient();

  // Get assignment with coach
  const { data: assignment, error: assignmentError } = await supabase
    .from("coach_assignments")
    .select(`
      *,
      coach:coaches(*)
    `)
    .eq("id", assignmentId)
    .single();

  if (assignmentError) {
    console.error("[getCoachProfile] Error:", assignmentError);
    throw new Error("Failed to fetch coach profile");
  }

  if (!assignment || !assignment.coach) {
    return null;
  }

  // Calculate average response time (mock for now - can be enhanced with actual data)
  const responseTime = "בד\"כ בתוך 4 שעות";

  return {
    coach: assignment.coach as Coach,
    assignment: {
      id: assignment.id,
      user_id: assignment.user_id,
      coach_id: assignment.coach_id,
      status: assignment.status,
      started_at: assignment.started_at,
      ended_at: assignment.ended_at,
      created_at: assignment.created_at,
      updated_at: assignment.updated_at,
    },
    responseTime,
  };
}

/**
 * Get upcoming session (within next 7 days)
 */
export async function getUpcomingSession(assignmentId: string): Promise<CoachSession | null> {
  const supabase = await createServerSupabaseClient();

  const now = new Date().toISOString();
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("coach_sessions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .eq("status", "scheduled")
    .gte("start_t", now)
    .lte("start_t", sevenDaysFromNow)
    .order("start_t", { ascending: true })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows found
      return null;
    }
    console.error("[getUpcomingSession] Error:", error);
    return null;
  }

  return data as CoachSession;
}

/**
 * Get tasks for an assignment
 * @param range - 'today' | 'week'
 */
export async function getTasks(
  assignmentId: string,
  range: "today" | "week" = "week"
): Promise<CoachTaskWithCompletion[]> {
  const supabase = await createServerSupabaseClient();

  // Calculate date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const endDate = new Date(today);
  if (range === "week") {
    endDate.setDate(endDate.getDate() + 7);
  } else {
    endDate.setDate(endDate.getDate() + 1);
  }
  const endDateStr = endDate.toISOString().split("T")[0];

  // Get tasks with completions
  const { data: assignment, error: assignmentError } = await supabase
    .from("coach_assignments")
    .select("user_id")
    .eq("id", assignmentId)
    .single();

  if (assignmentError || !assignment) {
    console.error("[getTasks] Assignment error:", assignmentError);
    return [];
  }

  const userId = assignment.user_id;

  const { data, error } = await supabase
    .from("coach_tasks")
    .select(`
      *,
      completion:coach_task_completions(*)
    `)
    .eq("assignment_id", assignmentId)
    .or(`due_date.is.null,due_date.gte.${todayStr}`)
    .or(`due_date.is.null,due_date.lt.${endDateStr}`)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[getTasks] Error:", error);
    return [];
  }

  // Transform data to include only user's completion
  const tasks: CoachTaskWithCompletion[] = (data || []).map((task: any) => {
    const completions = Array.isArray(task.completion) ? task.completion : [];
    const userCompletion = completions.find((c: any) => c.user_id === userId) || null;

    return {
      id: task.id,
      assignment_id: task.assignment_id,
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      created_by: task.created_by,
      created_at: task.created_at,
      updated_at: task.updated_at,
      completion: userCompletion,
    };
  });

  return tasks;
}

/**
 * Get latest check-ins for an assignment
 */
export async function getLatestCheckins(assignmentId: string, limit: number = 6): Promise<Checkin[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("checkins")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getLatestCheckins] Error:", error);
    return [];
  }

  return (data || []) as Checkin[];
}

/**
 * Get message preview (last N messages)
 */
export async function getMessagePreview(assignmentId: string, limit: number = 3): Promise<CoachMessage[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("coach_messages")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getMessagePreview] Error:", error);
    return [];
  }

  return (data || []) as CoachMessage[];
}

/**
 * Get all sessions for an assignment
 */
export async function getSessions(assignmentId: string): Promise<CoachSession[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("coach_sessions")
    .select("*")
    .eq("assignment_id", assignmentId)
    .order("start_t", { ascending: false });

  if (error) {
    console.error("[getSessions] Error:", error);
    return [];
  }

  return (data || []) as CoachSession[];
}

/**
 * Check if a time slot overlaps with existing sessions
 */
export async function hasSessionOverlap(
  assignmentId: string,
  startTime: string,
  endTime: string,
  excludeSessionId?: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("coach_sessions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .neq("status", "canceled")
    .or(`start_t.lt.${endTime},end_t.gt.${startTime}`);

  if (excludeSessionId) {
    query = query.neq("id", excludeSessionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[hasSessionOverlap] Error:", error);
    return false;
  }

  return (data || []).length > 0;
}
