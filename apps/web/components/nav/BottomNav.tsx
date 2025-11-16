"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { TrendingUp, Utensils, Bot, User } from "lucide-react";
import { NavItem } from "./NavItem";
import { tokens } from "@/lib/ui/tokens";
import texts from "@/lib/assistantTexts";
import MapFab from "@/components/map/MapFab";
import { uiBus } from "@/lib/ui/eventBus";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;
  const isMapActive = isActive("/journey");

  const handleMapClick = () => {
    if (pathname === "/journey") {
      // Already on journey page - emit event to open stage picker
      uiBus.emit("open-stage-picker");
    } else {
      // Navigate to journey page
      router.push("/journey");
    }
  };

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-[#1a1b1c] border-t border-zinc-700"
      style={{
        paddingBottom: `env(safe-area-inset-bottom, 0px)`,
        backgroundColor: '#1a1b1c',
        WebkitBackdropFilter: 'none',
        backdropFilter: 'none',
      }}
    >
      {/* Bottom bar with fixed height and grid layout */}
      <div className="relative h-20 px-2 sm:px-4">
        {/* Grid layout with spacers around center FAB for breathing room */}
        <div className="grid grid-cols-[1fr_1fr_0.3fr_0.3fr_1fr_1fr] h-full" dir="rtl">
          {/* Tab 1 - Progress */}
          <div className="flex justify-center items-center">
            <NavItem
              href="/progress"
              label="התקדמות"
              icon={<TrendingUp size={20} strokeWidth={2} />}
              active={isActive("/progress")}
            />
          </div>

          {/* Tab 2 - Nutrition */}
          <div className="flex justify-center items-center">
            <NavItem
              href="/nutrition"
              label={texts.nav.nutrition}
              icon={<Utensils size={20} strokeWidth={2} />}
              active={isActive("/nutrition")}
            />
          </div>

          {/* Spacer for FAB breathing room (right side) */}
          <div aria-hidden="true" />

          {/* Spacer for FAB breathing room (left side) */}
          <div aria-hidden="true" />

          {/* Tab 3 - Coach */}
          <div className="flex justify-center items-center">
            <NavItem
              href="/coach"
              label={texts.nav.coach}
              icon={<Bot size={20} strokeWidth={2} />}
              active={isActive("/coach")}
            />
          </div>

          {/* Tab 4 - Profile */}
          <div className="flex justify-center items-center">
            <NavItem
              href="/profile"
              label={texts.nav.profile}
              icon={<User size={20} strokeWidth={2} />}
              active={isActive("/profile")}
            />
          </div>
        </div>

        {/* Center FAB - Absolutely positioned with translate(-50%, -50%) anchor */}
        <div className="pointer-events-none absolute inset-x-0 top-0" aria-hidden="true">
          <div className="pointer-events-auto absolute left-1/2 top-0 -translate-x-1/2 -translate-y-[50%]">
            <MapFab onClick={handleMapClick} />
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
