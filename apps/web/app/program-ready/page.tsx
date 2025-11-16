"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import texts from "@/lib/assistantTexts";

export default function ProgramReadyPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);

    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, []);

  function handleContinue() {
    // If user is authenticated, go to journey map
    // Otherwise, redirect to signup/registration page
    if (hasSession) {
      router.push("/journey");
    } else {
      router.push("/signup");
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex flex-col items-center justify-center text-white px-6">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Success Icon */}
        <div className="w-24 h-24 mx-auto bg-[#E2F163] rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold">
          {texts.programReady.title}
        </h1>

        {/* Description */}
        <p className="text-xl text-white/80">
          {texts.programReady.description}
        </p>

        <div className="space-y-4 pt-6">
          <div className="bg-white/5 rounded-2xl p-4 text-right">
            <p className="text-sm text-white/60 mb-1">{texts.programReady.whatIncluded}</p>
            <ul className="text-base space-y-2">
              <li className="flex items-center gap-2">
                <span className="text-[#E2F163]">✓</span>
                <span>{texts.programReady.weeklyWorkouts}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#E2F163]">✓</span>
                <span>{texts.programReady.nutritionPlan}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#E2F163]">✓</span>
                <span>{texts.programReady.goalCalculation}</span>
              </li>
            </ul>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            className="w-full h-14 bg-[#E2F163] text-black font-bold text-lg rounded-full transition hover:bg-[#d4e350] active:translate-y-1 active:brightness-90"
          >
            {texts.programReady.letsStart}
          </button>
        </div>
      </div>
    </div>
  );
}
