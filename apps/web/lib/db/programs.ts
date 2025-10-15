import { createServerSupabaseClient } from "@/lib/supabase-server";

export type ProgramRow = {
  id: string;
  user_id: string;
  days_estimate: number;
  workout_plan_text: string;
  nutrition_plan_json: unknown;
  created_at: string;
  updated_at: string;
};

export type ProgramWithData = {
  program: ProgramRow;
  daysRemaining: number;
};

export async function getUserPrograms(userId: string): Promise<ProgramWithData[]> {
  const supabase = await createServerSupabaseClient();

  const { data: programs, error } = await supabase
    .from("programs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<ProgramRow[]>();

  if (error) throw error;

  if (!programs?.length) return [];

  // Calculate days remaining for each program
  return programs.map((p) => {
    const createdDate = new Date(p.created_at);
    const today = new Date();
    const daysPassed = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, p.days_estimate - daysPassed);

    return {
      program: p,
      daysRemaining,
    };
  });
}

export async function getUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
