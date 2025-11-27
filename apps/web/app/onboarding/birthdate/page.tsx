"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, startTransition } from "react";
import { getOnboardingData } from "@/lib/onboarding-storage";
import { saveOnboardingDraft } from "@/lib/onboarding/saveDraft";
import { queueDraftRetry } from "@/lib/onboarding/retryQueue";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

export default function BirthdatePage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  // Default to age 18 (will be overridden by saved data if it exists)
  const [year, setYear] = useState(currentYear - 18);
  const [month, setMonth] = useState(0); // January (0-indexed)
  const [day, setDay] = useState(1);
  const submittedRef = useRef(false);

  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  // Load user data on mount
  useEffect(() => {
    const data = getOnboardingData();
    if (data.birthdate) {
      const date = new Date(data.birthdate);
      setYear(date.getFullYear());
      setMonth(date.getMonth());
      setDay(date.getDate());
    }
  }, []);

  const yearValues = Array.from({ length: 86 }, (_, i) => currentYear - i); // Current year to 86 years ago
  const dayValues = Array.from({ length: 31 }, (_, i) => i + 1);

  // Calculate age
  const calculateAge = () => {
    const today = new Date();
    const birthDate = new Date(year, month, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge();

  const handleYearScroll = () => {
    if (!yearRef.current || !initializedRef.current) return;
    const itemHeight = 60;
    const scrollTop = yearRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (yearValues[index]) {
      setYear(yearValues[index]);
    }
  };

  const handleMonthScroll = () => {
    if (!monthRef.current || !initializedRef.current) return;
    const itemHeight = 60;
    const scrollTop = monthRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index >= 0 && index < 12) {
      setMonth(index);
    }
  };

  const handleDayScroll = () => {
    if (!dayRef.current || !initializedRef.current) return;
    const itemHeight = 60;
    const scrollTop = dayRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (dayValues[index]) {
      setDay(dayValues[index]);
    }
  };

  // Initialize scroll positions after data loads and DOM is ready
  useEffect(() => {
    // Only initialize once
    if (initializedRef.current) return;

    // Use requestAnimationFrame to ensure DOM is painted
    const initScroll = () => {
      requestAnimationFrame(() => {
        const itemHeight = 60;
        if (yearRef.current) {
          const index = yearValues.indexOf(year);
          yearRef.current.scrollTop = index * itemHeight;
        }
        if (monthRef.current) {
          monthRef.current.scrollTop = month * itemHeight;
        }
        if (dayRef.current) {
          dayRef.current.scrollTop = (day - 1) * itemHeight;
        }
        // Mark as initialized after scroll positions are set
        setTimeout(() => {
          initializedRef.current = true;
        }, 100);
      });
    };

    // Small delay to ensure refs are attached after hydration
    const timer = setTimeout(initScroll, 50);
    return () => clearTimeout(timer);
  }, [year, month, day, yearValues]);

  const handleContinue = () => {
    // Don't proceed if under 18
    if (age < 18) {
      return;
    }

    // Prevent double submissions
    if (submittedRef.current) return;
    submittedRef.current = true;

    const birthdate = new Date(year, month, day);
    const formData = {
      birthdate: birthdate.toISOString()
    };

    // 1) Navigate immediately (no loading state!)
    startTransition(() => {
      router.push("/onboarding/target-weight");
    });

    // 2) Save in background (fire-and-forget)
    (async () => {
      try {
        await saveOnboardingDraft(formData);
      } catch (error) {
        console.warn('[Birthdate] Background save failed:', error);
        // Queue for retry
        queueDraftRetry('birthdate', formData);
      }
    })();
  };

  return (
    <OnboardingShell
      title="מתי נולדת?"
      subtitle={
        <>
          הגיל שלך משפיע על ההמלצות<br />שתקבלי באופן שוטף.
        </>
      }
      disableContentScroll={false}
      footer={
        <>
          {/* Age Warning */}
          {age < 18 && (
            <div className="mb-4">
              <div className="bg-red-500/10 border-2 border-red-500/30 rounded-3xl p-6">
                <div className="flex items-start gap-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 mt-1">
                    <path d="M12 2L2 20h20L12 2z" fill="#EF4444" opacity="0.2" />
                    <path d="M12 2L2 20h20L12 2z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 9v4M12 17h.01" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex-1 text-right">
                    <p className="text-red-400 font-semibold text-base leading-relaxed">
                      השימוש באפליקציה מיועד לגילאי 18 ומעלה.
                      <br />
                      הגיל שלך: {age} שנים
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <PrimaryButton
            onClick={handleContinue}
            disabled={age < 18}
            className="h-14 text-lg"
          >
            הבא
          </PrimaryButton>
        </>
      }
    >
      {/* Date Pickers */}
      <div className="flex gap-3 justify-center mb-8">
        {/* Day Picker */}
        <div className="flex flex-col items-center flex-1 max-w-[100px]">
          <p className="text-white/70 text-sm mb-2">יום</p>
          <div className="relative w-full">
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0e0f12] to-transparent" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 bg-white/5 rounded-2xl border border-white/20" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e0f12] to-transparent" />
            </div>
            <div
              ref={dayRef}
              onScroll={handleDayScroll}
              className="h-48 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
              <div className="h-16" />
              {dayValues.map((d) => (
                <div
                  key={d}
                  className="h-[60px] flex items-center justify-center snap-center"
                >
                  <span className={`text-xl transition-all ${
                    d === day ? "font-bold text-white scale-110" : "text-white/30"
                  }`}>
                    {d.toString().padStart(2, '0')}
                  </span>
                </div>
              ))}
              <div className="h-16" />
            </div>
          </div>
        </div>

        {/* Month Picker */}
        <div className="flex flex-col items-center flex-1 max-w-[130px]">
          <p className="text-white/70 text-sm mb-2">חודש</p>
          <div className="relative w-full">
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0e0f12] to-transparent" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 bg-white/5 rounded-2xl border border-white/20" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e0f12] to-transparent" />
            </div>
            <div
              ref={monthRef}
              onScroll={handleMonthScroll}
              className="h-48 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
              <div className="h-16" />
              {MONTHS.map((m, idx) => (
                <div
                  key={idx}
                  className="h-[60px] flex items-center justify-center snap-center"
                >
                  <span className={`text-lg transition-all ${
                    idx === month ? "font-bold text-white scale-110" : "text-white/30"
                  }`}>
                    {m}
                  </span>
                </div>
              ))}
              <div className="h-16" />
            </div>
          </div>
        </div>

        {/* Year Picker */}
        <div className="flex flex-col items-center flex-1 max-w-[100px]">
          <p className="text-white/70 text-sm mb-2">שנה</p>
          <div className="relative w-full">
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0e0f12] to-transparent" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 bg-white/5 rounded-2xl border border-white/20" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e0f12] to-transparent" />
            </div>
            <div
              ref={yearRef}
              onScroll={handleYearScroll}
              className="h-48 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
              <div className="h-16" />
              {yearValues.map((y) => (
                <div
                  key={y}
                  className="h-[60px] flex items-center justify-center snap-center"
                >
                  <span className={`text-xl transition-all ${
                    y === year ? "font-bold text-white scale-110" : "text-white/30"
                  }`}>
                    {y}
                  </span>
                </div>
              ))}
              <div className="h-16" />
            </div>
          </div>
        </div>
      </div>

      {/* Age Display */}
      <div className="text-center mt-8">
        <p className="text-xl font-semibold text-white/70">
          הגיל שלך {age} שנים
        </p>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </OnboardingShell>
  );
}
