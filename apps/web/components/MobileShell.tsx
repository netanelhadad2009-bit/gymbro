"use client";
import React from "react";

type Props = {
  header?: React.ReactNode;     // e.g., page title bar
  footer?: React.ReactNode;     // e.g., primary CTA or BottomNav
  children: React.ReactNode;    // scrollable content
  className?: string;
};

export default function MobileShell({ header, footer, children, className }: Props) {
  return (
    <div className="screen min-h-[100dvh] flex flex-col bg-[#0F1113] text-white">
      {/* Fixed header + safe area */}
      {header && (
        <div className="sticky-top safe-pt bg-[#0F1113]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0F1113]/75">
          {header}
        </div>
      )}

      {/* Scrollable content */}
      <div className={`scroll-y flex-1 px-4 ${className ?? ""}`}>
        {children}
      </div>

      {/* Fixed footer + safe area */}
      {footer && (
        <div className="sticky-bottom safe-pb bg-[#0F1113]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0F1113]/75">
          {footer}
        </div>
      )}
    </div>
  );
}
