"use client";

import { BottomNav } from "@/components/nav/BottomNav";
import { usePathname } from "next/navigation";
import { SheetProvider, useSheet } from "@/contexts/SheetContext";
import { DailyLoginTracker } from "@/components/streak/DailyLoginTracker";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isSheetOpen, isKeyboardVisible } = useSheet();

  // Hide bottom nav on scan/review pages (full-screen experience), when sheet is open
  // For modal sheets: hide nav when keyboard is visible
  // For coach chat: don't hide nav (let native keyboard resize handle it)
  const isCoachChat = pathname?.includes('/coach');
  const hideBottomNav = pathname?.includes('/scan/review') || isSheetOpen || (isKeyboardVisible && !isCoachChat);

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
