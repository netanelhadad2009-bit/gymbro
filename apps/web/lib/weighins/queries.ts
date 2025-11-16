/**
 * Weigh-ins data queries (server and client safe)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type WeighIn = {
  id: string;
  user_id: string;
  weight_kg: number;
  date: string;
  notes?: string | null;
  created_at: string;
};

export type WeighInInput = {
  date: string | Date;
  weight_kg: number;
  notes?: string;
};

/**
 * Get recent weigh-ins for a user
 */
export async function getRecentWeighIns(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 7
): Promise<WeighIn[]> {
  const { data, error } = await supabase
    .from("weigh_ins")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[WeighIns] Query error:", error);
    return [];
  }

  return data || [];
}

/**
 * Create a new weigh-in
 */
export async function createWeighIn(
  supabase: SupabaseClient,
  userId: string,
  input: WeighInInput
): Promise<{ ok: boolean; data?: WeighIn; error?: string }> {
  // Normalize date to ISO string (timestamptz)
  const date = typeof input.date === "string" ? input.date : input.date.toISOString();

  const { data, error } = await supabase
    .from("weigh_ins")
    .insert({
      user_id: userId,
      weight_kg: input.weight_kg,
      date,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error("[WeighIns] Create error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

/**
 * Delete a weigh-in
 */
export async function deleteWeighIn(
  supabase: SupabaseClient,
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("weigh_ins").delete().eq("id", id);

  if (error) {
    console.error("[WeighIns] Delete error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Subscribe to weigh-ins changes
 */
export function subscribeWeighIns(
  supabase: SupabaseClient,
  userId: string,
  callbacks: {
    onInsert?: (weighIn: WeighIn) => void;
    onUpdate?: (weighIn: WeighIn) => void;
    onDelete?: (weighIn: WeighIn) => void;
  }
): () => void {
  const channelName = `weigh_ins:${userId}`;

  console.log("[WeighIns RT] 🔌 Subscribing:", channelName);

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "weigh_ins",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[WeighIns RT] ➕ INSERT");
        callbacks.onInsert?.(payload.new as WeighIn);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "weigh_ins",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[WeighIns RT] ✏️  UPDATE");
        callbacks.onUpdate?.(payload.new as WeighIn);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "weigh_ins",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[WeighIns RT] 🗑️  DELETE");
        callbacks.onDelete?.(payload.old as WeighIn);
      }
    )
    .subscribe((status) => {
      console.log("[WeighIns RT] 📊 Status:", status);
    });

  return () => {
    console.log("[WeighIns RT] 🛑 Unsubscribing:", channelName);
    supabase.removeChannel(channel);
  };
}
