"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import texts from "@/lib/assistantTexts";
import { openExternal } from "@/lib/openExternal";

const SOURCES = [
  {
    title: "שיעור חילוף חומרים בסיסי",
    url: "https://pubmed.ncbi.nlm.nih.gov/2305711/",
  },
  {
    title: "ספירת קלוריות - הרווארד",
    url: "https://pubmed.ncbi.nlm.nih.gov/6721853/",
  },
  {
    title: "ערכי צריכה תזונתיים מומלצים",
    url: "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables.html",
  },
  {
    title: "האגודה הבינלאומית לתזונת ספורט",
    url: "https://journals.lww.com/acsm-msse/Fulltext/2011/07000/Quantity_and_Quality_of_Exercise_for_Developing.26.aspx",
  },
  {
    title: "ארגון הבריאות העולמי",
    url: "https://www.who.int/publications/i/item/9789240015128",
  },
];

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

  const handleSourceClick = async (url: string) => {
    await openExternal(url);
  };

  // Show loading state instead of null to prevent black screen
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-lg">טוען...</div>
      </div>
    );
  }

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

        {/* Information Sources */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <h3 className="text-base font-semibold text-white/80 mb-4 text-center">
            התוכנית מבוססת על המקורות הבאים, בין היתר מחקרים רפואיים שנבדקו:
          </h3>
          <div className="space-y-2">
            {SOURCES.map((source, index) => (
              <button
                key={index}
                onClick={() => handleSourceClick(source.url)}
                className="w-full bg-white/5 hover:bg-white/10 rounded-xl p-4 text-right transition-colors active:scale-[0.98] flex items-center justify-between group"
              >
                <span className="text-white/90 text-sm">{source.title}</span>
                <svg
                  className="w-4 h-4 text-white/40 group-hover:text-[#E2F163] transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
