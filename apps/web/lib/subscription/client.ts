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
 * Save an Apple IAP subscription to Supabase
 *
 * @param authUserId - The Supabase auth user ID
 * @param plan - 'monthly' or 'yearly'
 * @param transactionId - Apple transaction ID
 * @returns The created subscription or null if failed
 */
export async function saveAppleSubscription(
  authUserId: string,
  plan: 'monthly' | 'yearly',
  transactionId: string
): Promise<Subscription | null> {
  const appUserId = `user_${authUserId}`;

  console.log("[Subscription][Client] Saving Apple subscription", {
    authUserId,
    appUserId,
    plan,
    transactionId,
  });

  try {
    // Calculate period end based on plan
    const now = new Date();
    let periodEnd: Date;
    if (plan === 'yearly') {
      periodEnd = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    } else {
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    }

    // First, cancel any existing active subscriptions
    const { error: cancelError } = await supabase
      .from("Subscription")
      .update({ status: 'canceled' })
      .eq("userId", appUserId)
      .in("status", ["active", "trialing"]);

    if (cancelError) {
      console.warn("[Subscription][Client] Failed to cancel old subscriptions", cancelError);
    }

    // Insert new subscription
    // Note: We store the transaction ID in the 'id' field or as metadata
    // The Subscription table might not have apple_transaction_id column
    const subscriptionData: Record<string, any> = {
      userId: appUserId,
      provider: 'apple',
      status: 'active',
      plan: plan,
      current_period_end: periodEnd.toISOString(),
    };

    console.log("[Subscription][Client] Inserting subscription:", subscriptionData);

    const { data, error } = await supabase
      .from("Subscription")
      .insert(subscriptionData)
      .select()
      .single();

    if (error) {
      console.error("[Subscription][Client] Failed to save subscription", {
        authUserId,
        appUserId,
        error: error.message,
        code: error.code,
      });
      return null;
    }

    console.log("[Subscription][Client] Subscription saved successfully", {
      subscriptionId: data.id,
      userId: appUserId,
      status: data.status,
      plan: data.plan,
    });

    return mapRowToSubscription(data as SubscriptionRow);
  } catch (err) {
    console.error("[Subscription][Client] Unexpected error saving subscription", {
      authUserId,
      appUserId,
      error: err,
    });
    return null;
  }
}

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
