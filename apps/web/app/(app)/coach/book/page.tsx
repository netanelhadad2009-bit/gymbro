"use client";

import { useRouter } from "next/navigation";
import StickyHeader from "@/components/ui/StickyHeader";

export default function CoachBookPage() {
  const router = useRouter();

  return (
    <div className="h-[100dvh] grid grid-rows-[auto_1fr] bg-[#0D0E0F]" dir="rtl">
      <StickyHeader
        title="קביעת אימון"
        leftSlot={
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center hover:bg-neutral-700 transition-colors"
            aria-label="חזור"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        }
      />

      <div className="flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">קביעת אימון</h1>
          <p className="text-neutral-400 mb-6">
            תכונת קביעת האימונים זמינה דרך העמוד הראשי
          </p>

          <button
            onClick={() => router.push("/coach")}
            className="px-6 py-3 bg-[#E2F163] text-black font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all"
          >
            חזור לעמוד המאמן
          </button>
        </div>
      </div>
    </div>
  );
}
