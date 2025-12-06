"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { clearAll, migrateGuestCache, cleanLegacyKeys, debugKeys, clearNutritionPlans } from "@/lib/storage";
import { saveOnboardingData } from "@/lib/onboarding-storage";
import { syncProfileAfterLogin, wasOnboardingJustCompleted } from "@/lib/profile/sync";
import type { Subscription } from "@/lib/subscription/types";
import { fetchActiveSubscriptionClient } from "@/lib/subscription/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Subscription state
  subscription: Subscription | null;
  isPremium: boolean;
  isSubscriptionLoading: boolean;
  subscriptionError: string | null;
  // Subscription actions
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  // Subscription defaults
  subscription: null,
  isPremium: false,
  isSubscriptionLoading: false,
  subscriptionError: null,
  refreshSubscription: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscription state
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  // Derive isPremium from subscription status
  const isPremium =
    !!subscription &&
    (subscription.status === "active" || subscription.status === "trialing");

  // Refresh subscription status (e.g., after a purchase)
  const refreshSubscription = async () => {
    if (!user) return;

    try {
      setIsSubscriptionLoading(true);
      setSubscriptionError(null);

      console.log("[AuthProvider] Refreshing subscription for user:", user.id.slice(0, 8) + "...");

      const sub = await fetchActiveSubscriptionClient(user.id);
      setSubscription(sub);

      console.log("[AuthProvider] Subscription refreshed", {
        userId: user.id.slice(0, 8) + "...",
        hasSubscription: !!sub,
        status: sub?.status ?? null,
        plan: sub?.plan ?? null,
        isPremium: !!sub && (sub.status === "active" || sub.status === "trialing"),
      });
    } catch (err) {
      console.error("[AuthProvider] Failed to refresh subscription", err);
      setSubscriptionError("Failed to refresh subscription");
    } finally {
      setIsSubscriptionLoading(false);
    }
  };

  useEffect(() => {
    console.log("[AuthProvider] Initializing auth state...");

    // Clean legacy keys on first load
    cleanLegacyKeys();

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log("[AuthProvider] Initial session loaded:", session ? `User: ${session.user.id.slice(0, 8)}...` : "No session");
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error("[AuthProvider] Failed to get session:", error);
        // On network error, assume no session and stop loading
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.info("[AuthProvider] Auth event:", event);

      // Clear all cached data on sign out
      if (event === "SIGNED_OUT") {
        if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
          console.log(`[Auth] ${event} → clearAll()`);
        }
        clearAll();
      }

      if (event === "SIGNED_IN" && session?.user?.id) {
        // Clean legacy keys first
        cleanLegacyKeys();

        // Migrate guest data to authenticated user
        if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
          console.log("[Auth] SIGNED_IN → migrateGuestCache() / cleanLegacyKeys()");
        }
        migrateGuestCache(session.user.id);

        // Sync profile and metadata
        (async () => {
          const userId = session.user!.id;

          // CRITICAL: Check if onboarding was just completed
          // If so, sync profile to database FIRST before any other operations
          if (wasOnboardingJustCompleted()) {
            console.log("[Auth] Onboarding just completed - running profile sync...");
            try {
              const syncResult = await syncProfileAfterLogin(userId);
              console.log("[Auth] Profile sync result:", syncResult);
            } catch (err) {
              console.error("[Auth] Profile sync failed:", err);
            }
          }

          const { data } = await supabase.auth.getUser();
          const meta = data.user?.user_metadata ?? {};

          if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
            console.log("[Auth] Syncing Supabase metadata to localStorage:", meta);
          }

          // Import the function to get existing onboarding data
          const { getOnboardingDataOrNull } = await import('@/lib/onboarding-storage');
          const existingData = getOnboardingDataOrNull();

          // Check if existing data is more complete than Supabase metadata
          const existingIsComplete = existingData && (
            existingData.gender &&
            existingData.goals?.length &&
            existingData.height_cm &&
            existingData.weight_kg
          );

          const metaHasData = (
            meta.gender_he || meta.gender ||
            meta.height_cm ||
            meta.weight_kg ||
            meta.goals?.length ||
            meta.goal_he
          );

          // Only save Supabase metadata if:
          // 1. There's no existing data, OR
          // 2. Existing data is incomplete AND Supabase has data to add
          if (!existingData || (!existingIsComplete && metaHasData)) {
            if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
              console.log("[Auth] Saving Supabase metadata (existing data incomplete or missing)");
            }

            // Merge with existing data instead of overwriting
            saveOnboardingData({
              ...existingData,  // Preserve existing data
              gender: meta.gender_he || meta.gender || existingData?.gender || undefined,
              height_cm: meta.height_cm || existingData?.height_cm || undefined,
              weight_kg: meta.weight_kg || existingData?.weight_kg || undefined,
              target_weight_kg: meta.target_weight_kg || existingData?.target_weight_kg || undefined,
              birthdate: meta.birthdate || existingData?.birthdate || undefined,
              activity: meta.activity_level_he || meta.activity || existingData?.activity || undefined,
              goals: meta.goal_he ? [meta.goal_he] : (meta.goals || existingData?.goals || undefined),
              diet: meta.diet_type_he || meta.diet || existingData?.diet || undefined,
              source: "supabase",
              updatedAt: Date.now(),
            });
          } else if (existingIsComplete) {
            if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
              console.log("[Auth] Skipping Supabase metadata sync - existing data is complete");
            }
          }

          // Clear old nutrition cache since profile may have changed
          try {
            clearNutritionPlans(session.user!.id);
            if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
              console.log("[Auth] Cleared old nutrition cache for user");
            }
          } catch (err) {
            console.warn("[Auth] Failed to clear old cache:", err);
          }
        })();

        if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
          debugKeys();
        }
      }

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  // Fetch subscription when user changes
  useEffect(() => {
    // If no user, clear subscription state
    if (!user) {
      setSubscription(null);
      setIsSubscriptionLoading(false);
      setSubscriptionError(null);
      return;
    }

    let cancelled = false;

    async function loadSubscription() {
      try {
        setIsSubscriptionLoading(true);
        setSubscriptionError(null);

        console.log("[AuthProvider] Loading subscription for user:", user!.id.slice(0, 8) + "...");

        const sub = await fetchActiveSubscriptionClient(user!.id);

        if (cancelled) return;

        setSubscription(sub);

        console.log("[AuthProvider] Subscription loaded", {
          userId: user!.id.slice(0, 8) + "...",
          hasSubscription: !!sub,
          status: sub?.status ?? null,
          plan: sub?.plan ?? null,
          isPremium: !!sub && (sub.status === "active" || sub.status === "trialing"),
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[AuthProvider] Failed to load subscription", err);
        setSubscriptionError("Failed to load subscription");
        setSubscription(null);
      } finally {
        if (!cancelled) {
          setIsSubscriptionLoading(false);
        }
      }
    }

    loadSubscription();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        subscription,
        isPremium,
        isSubscriptionLoading,
        subscriptionError,
        refreshSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
