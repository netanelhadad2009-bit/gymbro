/**
 * Journey Realtime - Subscription helpers
 *
 * Handles realtime subscriptions for user_progress table changes.
 */

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type ProgressChangePayload = {
  user_id: string;
  node_id: string;
  state: "LOCKED" | "AVAILABLE" | "ACTIVE" | "COMPLETED";
  progress_json: Record<string, any>;
  completed_at: string | null;
  updated_at: string | null;
};

export type ProgressChangeCallback = (payload: ProgressChangePayload) => void;

let debounceTimer: NodeJS.Timeout | null = null;
const DEBOUNCE_MS = 500;

/**
 * Subscribe to user_progress changes for a specific user
 *
 * @param userId - The user ID to subscribe to
 * @param onChange - Callback invoked when progress changes (debounced)
 * @returns RealtimeChannel subscription (call .unsubscribe() when done)
 */
export function subscribeUserProgress(
  userId: string,
  onChange: ProgressChangeCallback
): RealtimeChannel {
  console.log("[JourneyRealtime] Subscribing to user_progress:", userId.substring(0, 8));

  const channel = supabase
    .channel(`user_progress:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "user_progress",
        filter: `user_id=eq.${userId}`
      },
      (payload: any) => {
        console.log("[JourneyRealtime] Change detected:", {
          event: payload.eventType,
          node_id: (payload.new as any)?.node_id?.substring(0, 8) || (payload.old as any)?.node_id?.substring(0, 8)
        });

        // Debounce rapid changes
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          try {
            const data = payload.new as ProgressChangePayload;
            if (data && data.node_id) {
              onChange(data);
            }
          } catch (err: any) {
            console.error("[JourneyRealtime] Callback error:", err.message);
          }
        }, DEBOUNCE_MS);
      }
    )
    .subscribe((status: any) => {
      console.log("[JourneyRealtime] Subscription status:", status);
    });

  return channel;
}

/**
 * Subscribe to all user_progress changes (admin/debug use)
 */
export function subscribeAllProgress(
  onChange: ProgressChangeCallback
): RealtimeChannel {
  console.log("[JourneyRealtime] Subscribing to all user_progress");

  const channel = supabase
    .channel("user_progress:all")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "user_progress"
      },
      (payload: any) => {
        console.log("[JourneyRealtime] Global change:", {
          event: payload.eventType,
          user_id: (payload.new as any)?.user_id?.substring(0, 8)
        });

        try {
          const data = payload.new as ProgressChangePayload;
          if (data) {
            onChange(data);
          }
        } catch (err: any) {
          console.error("[JourneyRealtime] Callback error:", err.message);
        }
      }
    )
    .subscribe((status: any) => {
      console.log("[JourneyRealtime] Global subscription status:", status);
    });

  return channel;
}

/**
 * Cleanup helper - unsubscribe and clear timers
 */
export function cleanup(channel: RealtimeChannel) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  channel.unsubscribe();
  console.log("[JourneyRealtime] Unsubscribed and cleaned up");
}
