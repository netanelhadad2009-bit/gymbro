"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Dumbbell, Utensils, Map, Bot, User } from "lucide-react";
import { NavItem } from "./NavItem";
import { tokens } from "@/lib/ui/tokens";
import texts from "@/lib/assistantTexts";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;
  const isMapActive = isActive("/journey");

  return (
    <motion.nav
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
      className="fixed inset-x-0 bottom-3 z-50 flex justify-center pointer-events-none px-4"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
      }}
    >
      <div
        className="pointer-events-auto rounded-2xl px-2 sm:px-4 py-2.5 flex items-center relative w-full max-w-[560px] backdrop-blur-md"
        style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.outline}`,
          boxShadow: tokens.shadow.nav,
        }}
        dir="rtl"
      >
        {/* Right side - Single tab */}
        <div className="flex-1 flex justify-center">
          <NavItem
            href="/workouts"
            label={texts.nav.workouts}
            icon={<Dumbbell size={20} strokeWidth={2} />}
            active={isActive("/workouts")}
          />
        </div>

        {/* Right-center - Single tab with increased right margin */}
        <div className="flex-1 flex justify-center mr-4 sm:mr-12">
          <NavItem
            href="/nutrition"
            label={texts.nav.nutrition}
            icon={<Utensils size={20} strokeWidth={2} />}
            active={isActive("/nutrition")}
          />
        </div>

        {/* Larger responsive spacer for center button clearance */}
        <div className="w-16 sm:w-28" />

        {/* Center floating map button - Static, no animations */}
        <motion.button
          onClick={() => router.push("/journey")}
          aria-label={texts.nav.map}
          className="absolute left-1/2 flex items-center justify-center"
          style={{
            width: "68px",
            height: "68px",
            borderRadius: tokens.radii.full,
            backgroundColor: tokens.colors.surfaceHi,
            border: `3px solid #E2F163`,
            boxShadow: tokens.shadow.float,
            transform: "translateX(-50%) translateY(-28px)",
            zIndex: 10,
          }}
          whileTap={{ scale: 0.96 }}
        >
          {/* Icon in primary lime green */}
          <Map
            size={28}
            strokeWidth={2.5}
            style={{
              color: "#E2F163",
            }}
          />
        </motion.button>

        {/* Left-center - Single tab with increased left margin */}
        <div className="flex-1 flex justify-center ml-4 sm:ml-12">
          <NavItem
            href="/coach"
            label={texts.nav.coach}
            icon={<Bot size={20} strokeWidth={2} />}
            active={isActive("/coach")}
          />
        </div>

        {/* Left side - Single tab */}
        <div className="flex-1 flex justify-center">
          <NavItem
            href="/profile"
            label={texts.nav.profile}
            icon={<User size={20} strokeWidth={2} />}
            active={isActive("/profile")}
          />
        </div>
      </div>
    </motion.nav>
  );
}
