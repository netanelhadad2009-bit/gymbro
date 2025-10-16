"use client";
import React from "react";

type Props = {
  header?: React.ReactNode;     // e.g., page title bar
  footer?: React.ReactNode;     // e.g., primary CTA or BottomNav
  children: React.ReactNode;    // scrollable content
  className?: string;
  noHeaderShadow?: boolean;     // disable header backdrop blur/shadow
  title?: string;               // optional title for header
};

export default function MobileShell({ header, footer, children, className, noHeaderShadow, title }: Props) {
  return (
    <div className="screen min-h-[100dvh] flex flex-col bg-[#0B0D0F] text-white">
      {/* Fixed header + safe area */}
      {(header || title) && (
        <div className={`sticky-top safe-pt ${noHeaderShadow ? 'bg-[#0B0D0F]' : 'bg-[#0B0D0F]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B0D0F]/75'}`}>
          {header || (title && (
            <div className="px-4 py-3">
              <h1 className="text-lg font-bold text-center">{title}</h1>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable content */}
      <div className={`scroll-y flex-1 ${className ?? ""}`}>
        {children}
      </div>

      {/* Fixed footer + safe area */}
      {footer && (
        <div className={`sticky-bottom safe-pb px-4 py-3 ${noHeaderShadow ? 'bg-[#0B0D0F]' : 'bg-[#0B0D0F]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B0D0F]/75'}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
