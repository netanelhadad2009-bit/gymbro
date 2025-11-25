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
 * @param authUserId - The Supabase auth user ID (from session.user.id)
 * @returns The active/trialing subscription or null if none found
 */
export async function fetchActiveSubscriptionClient(
  authUserId: string
): Promise<Subscription | null> {
  // Derive the app user ID (public."User".id) from the auth user ID
  // The User table stores id as "user_<authUserId>"
  const appUserId = `user_${authUserId}`;

  console.log("[Subscription][Client] Resolving subscription", {
    authUserId,
    appUserId,
  });

  try {
    const { data, error } = await supabase
      .from("Subscription")
      .select("*")
      .eq("userId", appUserId)
      .in("status", ["active", "trialing"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Subscription][Client] Failed to fetch subscription", {
        authUserId,
        appUserId,
        error: error.message,
        code: error.code,
      });
      return null;
    }

    if (!data) {
      console.log("[Subscription][Client] No active subscription found", {
        authUserId,
        appUserId,
      });
      return null;
    }

    console.log("[Subscription][Client] Subscription loaded", {
      authUserId,
      appUserId,
      subscriptionId: data.id,
      status: data.status,
      plan: data.plan,
    });

    return mapRowToSubscription(data as SubscriptionRow);
  } catch (err) {
    console.error("[Subscription][Client] Unexpected error", {
      authUserId,
      appUserId,
      error: err,
    });
    return null;
  }
}
