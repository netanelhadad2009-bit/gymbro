"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface PremiumGateProps {
  children: ReactNode;
}

/**
 * PremiumGate - Protects all (app) routes for premium users only
 *
 * Behavior:
 * - Loading state → show loader
 * - No user → redirect to /login
 * - User but not premium and not on premium page → redirect to /premium
 * - User and premium → render children
 * - User not premium but on premium page → render children (the paywall)
 */
export function PremiumGate({ children }: PremiumGateProps) {
  const { user, loading, isPremium, isSubscriptionLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Check if we're on the premium page itself
  const isPremiumPage = pathname?.startsWith("/premium");

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

    // If user is not premium and not already on the premium page, redirect to premium
    if (!isPremium && !isPremiumPage) {
      console.log("[PremiumGate] User not premium, redirecting to /premium");
      router.replace("/premium");
      return;
    }

    // Otherwise, user can access the page
    console.log("[PremiumGate] Access granted", {
      isPremium,
      isPremiumPage,
      pathname,
    });
  }, [user, loading, isPremium, isSubscriptionLoading, isPremiumPage, router, pathname]);

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

  // If user is not premium and not on premium page, show nothing (redirect is happening)
  if (!isPremium && !isPremiumPage) {
    return null;
  }

  // Otherwise render the protected content
  return <>{children}</>;
}
