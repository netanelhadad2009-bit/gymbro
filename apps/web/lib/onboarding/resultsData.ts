"use server";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Attempts to read target weight from the most reliable sources, in order:
 * 1) profiles.goal_weight_kg
 * 2) user_targets.target_weight_kg
 * Fallback: null
 */
export async function getTargetWeightKg(): Promise<number | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // 1) profiles.goal_weight_kg
  const { data: prof } = await supabase
    .from("profiles")
    .select("goal_weight_kg")
    .eq("id", user.id)
    .single();
  if (prof?.goal_weight_kg) return Number(prof.goal_weight_kg);

  // 2) user_targets.target_weight_kg
  const { data: target } = await supabase
    .from("user_targets")
    .select("target_weight_kg")
    .eq("user_id", user.id)
    .maybeSingle();
  if (target?.target_weight_kg) return Number(target.target_weight_kg);

  return null;
}

/**
 * Returns signup date + 4 months in he-IL like "23 בדצמבר".
 * Prefers auth.users.created_at; falls back to profiles.created_at; else now().
 */
export async function getDeadlinePlus4Months(): Promise<string> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let baseDate = user?.created_at ? new Date(user.created_at) : null;

  if (!baseDate && user) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .single();
    if (prof?.created_at) baseDate = new Date(prof.created_at);
  }

  if (!baseDate) baseDate = new Date();

  // Add 4 months
  const future = new Date(baseDate);
  future.setMonth(future.getMonth() + 4);

  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
  }).format(future);
}
