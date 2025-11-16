/**
 * DailyLoginTracker - Automatically tracks user login streaks
 *
 * Marks today as done in user_activity when the user opens the app
 * Runs once per day per session
 * Navigates to streak page when streak increases (inline highlight)
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useStreakBump } from "@/lib/streak/useStreakBump";
import { setBumpFlag, getTodayYMD, getLastSeenStreak } from "@/lib/streak/storage";
import { supabase } from "@/lib/supabase";

export function DailyLoginTracker() {
  const hasTracked = useRef(false);
  const hasNavigated = useRef(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Get user ID
  useEffect(() => {
    const getUserId = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (error) {
        console.error("[DailyLoginTracker] Error getting user:", error);
      }
    };

    getUserId();
  }, []);

  // Track login and get streak
  useEffect(() => {
    // Only track once per session
    if (hasTracked.current || !userId) return;

    const trackLogin = async () => {
      try {
        const response = await fetch("/api/streak/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "login" }),
        });

        if (response.ok) {
          hasTracked.current = true;
          const data = await response.json();

          // Extract current streak from response
          const streak = data?.data?.current;
          if (typeof streak === "number") {
            setCurrentStreak(streak);
          }

          console.log("[DailyLoginTracker] Login tracked successfully", {
            streak,
          });
        }
      } catch (error) {
        console.error("[DailyLoginTracker] Failed to track login:", error);
      }
    };

    // Track login after a short delay to not block initial render
    const timer = setTimeout(trackLogin, 1000);

    return () => clearTimeout(timer);
  }, [userId]);

  // Detect streak bump and handle navigation
  const { shouldCelebrate, markShown } = useStreakBump({
    userId: userId || "",
    currentStreak,
  });

  // Always update lastSeen when we get a streak value (even if streak=0)
  useEffect(() => {
    if (!userId || currentStreak === null) return;

    const todayYMD = getTodayYMD();
    const lastSeen = getLastSeenStreak(userId);

    // Update lastSeen if it's not already set for today
    if (!lastSeen || lastSeen.ymd !== todayYMD) {
      markShown();
    }
  }, [userId, currentStreak, markShown]);

  // Handle celebration navigation (only when streak >= 1 and increased)
  useEffect(() => {
    if (!shouldCelebrate || !userId || currentStreak === null || hasNavigated.current) {
      return;
    }

    const todayYMD = getTodayYMD();
    const lastSeen = getLastSeenStreak(userId);
    const prevStreak = lastSeen?.value ?? currentStreak - 1;

    // Set bump flag in localStorage
    setBumpFlag(userId, currentStreak, prevStreak, todayYMD);

    // Check if already on streak page
    const isOnStreakPage = pathname === "/streak";

    if (isOnStreakPage) {
      // Already on streak page - dispatch event for inline highlight
      console.log("[Streak] bump (already on streak page) → inline highlight", {
        current: currentStreak,
        ymd: todayYMD,
      });

      window.dispatchEvent(
        new CustomEvent("streak:bump", {
          detail: { current: currentStreak, prev: prevStreak },
        })
      );
    } else {
      // Navigate to streak page
      console.log("[Streak] bump → redirecting to /streak", {
        current: currentStreak,
        ymd: todayYMD,
      });

      // Optional: Trigger haptics before navigation (mobile only)
      if (typeof window !== "undefined") {
        import("@capacitor/haptics")
          .then(({ Haptics, ImpactStyle }) => {
            Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
              // Fallback to web vibrate API
              if (navigator.vibrate) {
                navigator.vibrate(50);
              }
            });
          })
          .catch(() => {
            // Capacitor not available, try web vibrate API
            if (navigator.vibrate) {
              navigator.vibrate(50);
            }
          });
      }

      // Navigate with query params
      router.push("/streak?highlight=true&bump=1");
    }

    hasNavigated.current = true;
  }, [shouldCelebrate, userId, currentStreak, pathname, router]);

  return null; // This component doesn't render anything
}
