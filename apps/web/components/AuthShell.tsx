"use client";

import * as React from "react";

export default function AuthShell({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <main dir="rtl" className="min-h-screen bg-black text-white">
      {/* full-bleed background */}
      <div
        aria-hidden
        className="fixed inset-0 bg-center bg-cover"
        style={{
          // Put a real image under /public/hero.jpg later if needed
          backgroundImage: "url('/hero.jpg')",
        }}
      />
      {/* dark overlay */}
      <div className="fixed inset-0 bg-black/55" />

      {/* centered card container */}
      <div className="relative z-10 mx-auto w-full max-w-[420px] px-5 py-10">
        <div className="rounded-3xl bg-white/5 backdrop-blur-md p-5 shadow-xl ring-1 ring-white/10">
          <h1 className="text-center text-2xl font-extrabold tracking-tight mb-4">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </main>
  );
}



