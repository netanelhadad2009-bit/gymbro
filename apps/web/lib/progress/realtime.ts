/**
 * Progress realtime subscriptions
 * Subscribes to weigh_ins and meals changes
 */

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../supabase";

type ProgressChangeCallback = () => void;

/**
 * Subscribe to progress-related data changes (weigh_ins + meals)
 */
export function subscribeProgressUpdates(
  userId: string,
  onChange: ProgressChangeCallback
): () => void {
  const channelName = `progress:${userId}`;
  let currentChannel: RealtimeChannel | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let backoff = 1000;
  let isCleanedUp = false;

  console.log("[Progress RT] 🔌 Initializing subscription:", channelName);

  const createSubscription = () => {
    if (isCleanedUp) {
      console.log("[Progress RT] ⛔ Already cleaned up");
      return;
    }

    if (currentChannel) {
      console.log("[Progress RT] 🧹 Removing old channel");
      supabase.removeChannel(currentChannel);
      currentChannel = null;
    }

    console.log("[Progress RT] 📡 Creating channel:", channelName);

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
          table: "weigh_ins",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[Progress RT] ⚖️  weigh_ins event:", payload.eventType);
          onChange();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "meals",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log("[Progress RT] 🍽️  meals event:", payload.eventType);
          onChange();
        }
      )
      .subscribe((status, err) => {
        console.log("[Progress RT] 📊 Status:", status);

        if (err) {
          console.error("[Progress RT] ❌ Error:", err);
        }

        if (status === "SUBSCRIBED") {
          console.log("[Progress RT] ✅ Subscribed");
          backoff = 1000;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(`[Progress RT] ⚠️  ${status}, retry in ${backoff}ms`);

          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
          }

          reconnectTimeout = setTimeout(() => {
            if (!isCleanedUp) {
              console.log("[Progress RT] 🔄 Reconnecting...");
              createSubscription();
            }
          }, backoff);

          backoff = Math.min(backoff * 2, 15000);
        }
      });

    currentChannel = chan;
  };

  createSubscription();

  return () => {
    console.log("[Progress RT] 🛑 Cleanup");
    isCleanedUp = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (currentChannel) {
      console.log("[Progress RT] 🧹 Removing channel");
      supabase.removeChannel(currentChannel);
      currentChannel = null;
    }
  };
}
