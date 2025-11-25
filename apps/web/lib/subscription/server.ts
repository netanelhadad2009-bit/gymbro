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
 * @param authUserId - The Supabase auth user ID (from session.user.id)
 * @returns The active/trialing subscription or null if none found
 */
export async function getActiveSubscriptionForUser(
  authUserId: string
): Promise<Subscription | null> {
  // Derive the app user ID (public."User".id) from the auth user ID
  // The User table stores id as "user_<authUserId>"
  const appUserId = `user_${authUserId}`;

  console.log("[Subscription][Server] Resolving subscription", {
    authUserId,
    appUserId,
  });

  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from("Subscription")
      .select("*")
      .eq("userId", appUserId)
      .in("status", ["active", "trialing"])
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[Subscription][Server] Failed to fetch subscription", {
        authUserId,
        appUserId,
        error: error.message,
        code: error.code,
      });
      return null;
    }

    if (!data) {
      console.log("[Subscription][Server] No active subscription found", {
        authUserId,
        appUserId,
      });
      return null;
    }

    console.log("[Subscription][Server] Subscription loaded", {
      authUserId,
      appUserId,
      subscriptionId: data.id,
      status: data.status,
      plan: data.plan,
    });

    return mapRowToSubscription(data as SubscriptionRow);
  } catch (err) {
    console.error("[Subscription][Server] Unexpected error", {
      authUserId,
      appUserId,
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
