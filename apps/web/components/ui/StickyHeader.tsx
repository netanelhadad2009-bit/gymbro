"use client";

import React from "react";

interface StickyHeaderProps {
  title: string;
  rightSlot?: React.ReactNode;
  leftSlot?: React.ReactNode;
}

/**
 * Reusable sticky header component that handles safe area insets
 * with extra visual buffer beyond the notch.
 * Ensures title is never hidden behind notch/status bar and has comfortable spacing.
 */
export default function StickyHeader({ title, rightSlot, leftSlot }: StickyHeaderProps) {
  return (
    <header id="coach-header" className="header-safe w-full">
      <div className="mx-auto max-w-screen-sm px-4">
        <div className="header-inner relative flex items-center justify-center">
          {/* Left slot - absolute positioned */}
          {leftSlot && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2">
              {leftSlot}
            </div>
          )}

          {/* Centered page title */}
          <h1 className="header-title text-center">{title}</h1>

          {/* Right slot - absolute positioned */}
          {rightSlot && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              {rightSlot}
            </div>
          )}
        </div>
      </div>

      {/* Subtle divider */}
      <div
        className="mx-auto max-w-screen-sm opacity-20"
        style={{ borderBottom: "1px solid #ffffff1a" }}
      />
    </header>
  );
}
