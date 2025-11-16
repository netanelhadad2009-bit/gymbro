"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import { clearAll, migrateGuestCache, cleanLegacyKeys, debugKeys, clearNutritionPlans } from "@/lib/storage";
import { saveOnboardingData } from "@/lib/onboarding-storage";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Clean legacy keys on first load
    cleanLegacyKeys();

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
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
      data: { subscription },
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

        // Sync Supabase user_metadata to localStorage with fresh timestamp
        (async () => {
          const { data } = await supabase.auth.getUser();
          const meta = data.user?.user_metadata ?? {};

          if (process.env.NEXT_PUBLIC_LOG_CACHE === "1") {
            console.log("[Auth] Syncing Supabase metadata to localStorage:", meta);
          }

          // Save Supabase metadata to localStorage with timestamp
          saveOnboardingData({
            gender: meta.gender_he || meta.gender || undefined,
            height_cm: meta.height_cm || undefined,
            weight_kg: meta.weight_kg || undefined,
            target_weight_kg: meta.target_weight_kg || undefined,
            birthdate: meta.birthdate || undefined,
            activity: meta.activity_level_he || meta.activity || undefined,
            goals: meta.goal_he ? [meta.goal_he] : meta.goals || undefined,
            diet: meta.diet_type_he || meta.diet || undefined,
            source: "supabase",
            updatedAt: Date.now(),
          });

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

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
