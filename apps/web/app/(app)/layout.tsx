"use client";

import { BottomNav } from "@/components/nav/BottomNav";
import { usePathname } from "next/navigation";
import { SheetProvider, useSheet } from "@/contexts/SheetContext";
import { DailyLoginTracker } from "@/components/streak/DailyLoginTracker";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { PremiumGate } from "@/components/auth/PremiumGate";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSheetOpen, isKeyboardVisible } = useSheet();

  // Hide bottom nav on scan/review pages (full-screen experience), premium page, when sheet is open, or when keyboard is visible
  const hideBottomNav = pathname?.includes('/scan/review') || pathname?.includes('/premium') || isSheetOpen || isKeyboardVisible;

  return (
    <>
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
