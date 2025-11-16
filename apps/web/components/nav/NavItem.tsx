"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode } from "react";
import { tokens } from "@/lib/ui/tokens";

interface NavItemProps {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}

export function NavItem({ href, label, icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className="flex flex-col items-center justify-center gap-1 min-w-[44px] min-h-[44px] relative group"
    >
      <motion.div
        className="flex flex-col items-center gap-0.5"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        style={{ transformOrigin: "center" }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center transition-colors"
          style={{
            color: active ? tokens.colors.accent : tokens.colors.textMuted,
            opacity: active ? 1 : 0.7,
          }}
        >
          {icon}
        </div>

        {/* Label */}
        <span
          className="text-[10px] font-medium transition-colors"
          style={{
            color: active ? tokens.colors.accent : tokens.colors.textMuted,
          }}
        >
          {label}
        </span>

        {/* Active indicator dot - no layoutId to prevent layout shifts */}
        {active && (
          <motion.div
            className="absolute -bottom-1 w-1 h-1 rounded-full"
            style={{ backgroundColor: tokens.colors.accent }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </motion.div>

      {/* Focus ring for accessibility */}
      <div
        className="absolute inset-0 rounded-lg opacity-0 focus-visible:opacity-100 transition-opacity"
        style={{
          outline: `2px solid ${tokens.colors.accent}`,
          outlineOffset: "2px",
        }}
      />
    </Link>
  );
}
