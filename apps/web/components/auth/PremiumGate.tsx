"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";

interface PremiumGateProps {
  children: ReactNode;
}

/**
 * PremiumGate - Protects all (app) routes for premium users only
 *
 * Behavior:
 * - Loading state → show loader
 * - No user → redirect to /login
 * - User but not premium and not on premium/trial page → redirect to /premium
 * - User and premium → render children
 * - User not premium but on premium or trial page → render children (allow trial and paywall)
 */
export function PremiumGate({ children }: PremiumGateProps) {
  const { user, loading, isPremium, isSubscriptionLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on the premium or trial page
  const isPremiumOrTrialPage = pathname?.startsWith("/premium") || pathname?.startsWith("/trial");

  // Effect to handle redirects
  useEffect(() => {
    // Don't redirect while loading
    if (loading || isSubscriptionLoading) {
      return;
    }

    // If no user, redirect to login
    if (!user) {
      console.log("[PremiumGate] No user, redirecting to /login");
      router.replace("/login");
      return;
    }

    // If user is not premium and not already on the premium or trial page, redirect to premium
    if (!isPremium && !isPremiumOrTrialPage) {
      console.log("[PremiumGate] User not premium, redirecting to /premium");
      router.replace("/premium");
      return;
    }

    // Otherwise, user can access the page
    console.log("[PremiumGate] Access granted", {
      isPremium,
      isPremiumOrTrialPage,
      pathname,
    });
  }, [user, loading, isPremium, isSubscriptionLoading, isPremiumOrTrialPage, router, pathname]);

  // Set up native push notifications for logged-in users on native platform
  const pushSetupAttempted = useRef(false);
  useEffect(() => {
    // Only run once per mount, only on native, only when we have a user
    if (pushSetupAttempted.current) return;
    if (!user?.id) return;
    if (typeof window === "undefined") return;
    if (!Capacitor.isNativePlatform()) return;

    pushSetupAttempted.current = true;
    console.log("[PremiumGate] Calling setupNativePush for user:", user.id.substring(0, 8) + "...");

    // Dynamic import to avoid loading push code on web
    import("@/lib/push-notifications-native").then(({ setupNativePush }) => {
      setupNativePush(user.id);
    }).catch((err) => {
      console.error("[PremiumGate] Failed to load push notifications module:", err);
    });
  }, [user?.id]);

  // Show loading state while checking auth/subscription
  if (loading || isSubscriptionLoading) {
    return (
      <div className="min-h-screen bg-[#0b0d0e] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-lime-400 animate-spin" />
        <p className="text-white/60 text-sm">טוען את החשבון שלך…</p>
      </div>
    );
  }

  // If no user, show nothing (redirect is happening)
  if (!user) {
    return null;
  }

  // If user is not premium and not on premium or trial page, show nothing (redirect is happening)
  if (!isPremium && !isPremiumOrTrialPage) {
    return null;
  }

  // Otherwise render the protected content
  return <>{children}</>;
}
