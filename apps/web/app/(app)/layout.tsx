"use client";

import { useEffect, useRef } from "react";
import { BottomNav } from "@/components/nav/BottomNav";
import { usePathname } from "next/navigation";
import { SheetProvider, useSheet } from "@/contexts/SheetContext";
import { DailyLoginTracker } from "@/components/streak/DailyLoginTracker";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { PremiumGate } from "@/components/auth/PremiumGate";
import { AnalyticsIdentity } from "@/components/analytics/AnalyticsIdentity";
import { track } from "@/lib/mixpanel";
import { Capacitor } from "@capacitor/core";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSheetOpen, isKeyboardVisible } = useSheet();
  const hasTrackedAppOpen = useRef(false);

  // [analytics] Track app_opened once per session
  useEffect(() => {
    if (hasTrackedAppOpen.current) return;
    hasTrackedAppOpen.current = true;
    track("app_opened", {
      path: pathname,
      source: Capacitor.isNativePlatform() ? "native" : "web",
    });
  }, [pathname]);

  // Hide bottom nav on scan/review pages (full-screen experience), premium page, trial page, when sheet is open, or when keyboard is visible
  const hideBottomNav = pathname?.includes('/scan/review') || pathname?.includes('/premium') || pathname?.includes('/trial') || isSheetOpen || isKeyboardVisible;

  return (
    <>
      <AnalyticsIdentity />
      <DailyLoginTracker />
      <div className={hideBottomNav ? "" : "pb-24"}>{children}</div>
      {!hideBottomNav && <BottomNav />}
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PremiumGate>
      <LoadingProvider>
        <SheetProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </SheetProvider>
      </LoadingProvider>
    </PremiumGate>
  );
}
