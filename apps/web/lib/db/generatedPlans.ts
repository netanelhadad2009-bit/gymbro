import { createServerSupabaseClient } from "@/lib/supabase-server";

export type UserPlanRow = {
  id: string;
  user_id: string;
  days_estimate: number | null;
  workout_plan_text: string | null;
  nutrition_plan_json: any | null;
  created_at: string;
};

// If your table is named differently (e.g. "plans"), change TABLE_NAME only here.
const TABLE_NAME = "programs";

export async function getCurrentUserId() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

export async function getUserPlans(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<UserPlanRow[]>();

  if (error) throw error;
  return data ?? [];
}
