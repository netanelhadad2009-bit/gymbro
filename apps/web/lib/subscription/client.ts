/**
 * Client-side Subscription Helper
 *
 * This module provides client-side utilities for fetching subscription data.
 * Use this in client components (with "use client" directive).
 */

import { supabase } from "@/lib/supabase";
import type { Subscription, SubscriptionRow } from "./types";
import { mapRowToSubscription } from "./types";

/**
 * Fetch the active subscription for a user (client-side)
 *
 * @param userId - The Supabase auth user ID
 * @returns The active/trialing subscription or null if none found
 */
export async function fetchActiveSubscriptionClient(
  userId: string
): Promise<Subscription | null> {
  try {
    const { data, error } = await supabase
      .from("Subscription")
      .select("*")
      .eq("userId", userId)
      .in("status", ["active", "trialing"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Subscription][Client] Failed to fetch subscription", {
        userId,
        error: error.message,
        code: error.code,
      });
      return null;
    }

    if (!data) {
      console.log("[Subscription][Client] No active subscription found", {
        userId,
      });
      return null;
    }

    console.log("[Subscription][Client] Subscription loaded", {
      userId,
      subscriptionId: data.id,
      status: data.status,
      plan: data.plan,
    });

    return mapRowToSubscription(data as SubscriptionRow);
  } catch (err) {
    console.error("[Subscription][Client] Unexpected error", {
      userId,
      error: err,
    });
    return null;
  }
}
