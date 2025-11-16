"use client";

import { BottomNav } from "@/components/nav/BottomNav";
import { usePathname } from "next/navigation";
import { SheetProvider, useSheet } from "@/contexts/SheetContext";
import { DailyLoginTracker } from "@/components/streak/DailyLoginTracker";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSheetOpen } = useSheet();

  // Hide bottom nav on scan/review pages (full-screen experience) or when sheet is open
  const hideBottomNav = pathname?.includes('/scan/review') || isSheetOpen;

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
    <SheetProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SheetProvider>
  );
}
