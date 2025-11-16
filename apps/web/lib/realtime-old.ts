import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabase";

/**
 * Subscribe to ai_messages realtime updates for a specific user
 *
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Detailed connection logging
 * - Proper cleanup
 *
 * @param userId - User ID to filter messages
 * @param onInsert - Callback when new message is inserted
 * @returns Cleanup function to unsubscribe
 */
export function subscribeMessagesForUser(userId: string, onInsert: (row: any) => void) {
  const channelName = `ai_messages:${userId}`;
  let currentChannel: RealtimeChannel | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let backoff = 1000;
  let isCleanedUp = false;

  console.log("[RT] 🔌 Initializing subscription for channel:", channelName);

  const createSubscription = () => {
    if (isCleanedUp) {
      console.log("[RT] ⛔ Subscription cleaned up, not reconnecting");
      return;
    }

    // Remove old channel if exists
    if (currentChannel) {
      console.log("[RT] 🧹 Removing old channel before reconnect");
      supabase.removeChannel(currentChannel);
      currentChannel = null;
    }

    console.log("[RT] 📡 Creating new channel:", channelName);

    const chan: RealtimeChannel = supabase
      .channel(channelName, {
        config: {
          broadcast: { ack: true },
          presence: { key: userId },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_messages",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const eventId = (payload.new as any)?.id || (payload.old as any)?.id || "unknown";
          const role = (payload.new as any)?.role || "?";
          console.log(`[RT] ✉️  event: ${payload.eventType} ${eventId.substring(0, 8)}... (${role})`);

          if (payload.eventType === "INSERT" && payload.new) {
            console.log("[RT] 📨 Triggering onInsert callback");
            onInsert(payload.new);
          }
        }
      )
      .on("system", {} as any, (evt: any) => {
        console.log("[RT] 🔧 system event:", evt);
      })
      .subscribe((status, err) => {
        console.log(`[RT] 📊 status changed: ${status}`);

        if (err) {
          console.error("[RT] ❌ subscription error:", err);
        }

        if (status === "SUBSCRIBED") {
          console.log("[RT] ✅ Successfully subscribed to realtime");
          backoff = 1000; // Reset backoff on success
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(`[RT] ⚠️  Connection issue: ${status}, will retry in ${backoff}ms`);

          // Clear any existing reconnect timeout
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          // Schedule reconnect
          reconnectTimeout = setTimeout(() => {
            if (!isCleanedUp) {
              console.log("[RT] 🔄 Attempting reconnection...");
              createSubscription();
            }
          }, backoff);

          // Increase backoff for next retry
          backoff = Math.min(backoff * 2, 15000);
        }
      });

    currentChannel = chan;
  };

  // Initial subscription
  createSubscription();

  // Return cleanup function
  return () => {
    console.log("[RT] 🛑 Cleanup called for channel:", channelName);
    isCleanedUp = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (currentChannel) {
      console.log("[RT] 🧹 Removing channel");
      supabase.removeChannel(currentChannel);
      currentChannel = null;
    }
  };
}
