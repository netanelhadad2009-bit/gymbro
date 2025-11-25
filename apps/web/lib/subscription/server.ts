/**
 * Server-side Subscription Helper
 *
 * This module provides server-side utilities for fetching subscription data.
 * Use this in Server Components, Server Actions, and API routes.
 *
 * DO NOT import this file from client components!
 */

import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Subscription, SubscriptionRow } from "./types";
import { mapRowToSubscription } from "./types";

/**
 * Get the active subscription for a user (server-side)
 *
 * @param userId - The Supabase auth user ID
 * @returns The active/trialing subscription or null if none found
 */
export async function getActiveSubscriptionForUser(
  userId: string
): Promise<Subscription | null> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("Subscription")
      .select("*")
      .eq("userId", userId)
      .in("status", ["active", "trialing"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Subscription][Server] Failed to fetch subscription", {
        userId,
        error: error.message,
        code: error.code,
      });
      return null;
    }

    if (!data) {
      return null;
    }

    return mapRowToSubscription(data as SubscriptionRow);
  } catch (err) {
    console.error("[Subscription][Server] Unexpected error", {
      userId,
      error: err,
    });
    return null;
  }
}

/**
 * Get the active subscription for the currently authenticated user (server-side)
 *
 * This is a convenience wrapper that gets the user from the session first.
 *
 * @returns The active/trialing subscription or null if not authenticated or no subscription
 */
export async function getActiveSubscription(): Promise<Subscription | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("[Subscription][Server] No authenticated user");
      return null;
    }

    return getActiveSubscriptionForUser(user.id);
  } catch (err) {
    console.error("[Subscription][Server] Unexpected error getting user", {
      error: err,
    });
    return null;
  }
}
