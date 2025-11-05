"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NoCoachState() {
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const response = await fetch("/api/coach/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to request coach");
      }

      const result = await response.json();

      if (result.data.assigned) {
        // Dev mode: coach assigned immediately
        router.refresh();
      } else if (result.data.queued) {
        // Prod mode: request queued
        alert("הבקשה נקלטה! נחזור אליך בהקדם");
      }
    } catch (error) {
      console.error("Request error:", error);
      alert("שגיאה בשליחת הבקשה");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0E0F] flex items-center justify-center p-4" dir="rtl">
      <div className="max-w-md w-full bg-neutral-900/80 border border-neutral-800 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">אין לך מאמן עדיין</h1>
        <p className="text-neutral-400 mb-6">
          קבל מאמן אישי שילווה אותך בדרך לשיפור הכושר והבריאות
        </p>

        <button
          onClick={handleRequest}
          disabled={requesting}
          className="w-full px-6 py-3 bg-[#E2F163] text-black font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all disabled:opacity-50"
        >
          {requesting ? "שולח בקשה..." : "בקש מאמן אישי"}
        </button>
      </div>
    </div>
  );
}
