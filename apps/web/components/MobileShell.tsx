"use client";
import React from "react";

type Props = {
  header?: React.ReactNode;     // e.g., page title bar
  footer?: React.ReactNode;     // e.g., primary CTA or BottomNav
  children: React.ReactNode;    // scrollable content
  className?: string;
  noHeaderShadow?: boolean;     // disable header backdrop blur/shadow
  title?: string;               // optional title for header
  background?: React.ReactNode; // full-screen background (e.g., hero image)
  overlayClass?: string;        // overlay class for background (e.g., "bg-black/45")
};

export default function MobileShell({ header, footer, children, className, noHeaderShadow, title, background, overlayClass }: Props) {
  return (
    <div className="screen min-h-[100dvh] flex flex-col bg-[#0B0D0F] text-white relative">
      {/* Full-screen background image */}
      {background && (
        <div className="absolute inset-0 -z-10">
          {background}
          {overlayClass && <div className={`absolute inset-0 ${overlayClass}`} />}
        </div>
      )}

      {/* Fixed header + safe area */}
      {(header || title) && (
        <div className={`sticky top-0 z-40 safe-pt ${noHeaderShadow ? 'bg-transparent' : 'bg-[#0B0D0F]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B0D0F]/75'}`}>
          {header || (title && (
            <div className="px-4 py-3">
              <h1 className="text-lg font-bold text-center">{title}</h1>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable content - add padding when footer exists */}
      <div className={`flex-1 overflow-y-auto ${footer ? 'pb-24' : ''} ${className ?? ""}`}>
        {children}
      </div>

      {/* Fixed footer + safe area */}
      {footer && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 safe-pb px-4 pb-4 pt-3 ${noHeaderShadow ? 'bg-transparent' : 'bg-[#0B0D0F]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B0D0F]/75'}`}>
          {footer}
        </div>
      )}
    </div>
  );
}
