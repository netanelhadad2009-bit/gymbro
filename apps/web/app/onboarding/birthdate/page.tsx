"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { saveOnboardingData, getOnboardingData } from "@/lib/onboarding-storage";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

export default function BirthdatePage() {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(2002);
  const [month, setMonth] = useState(3); // April (0-indexed)
  const [day, setDay] = useState(5);
  const [isLoading, setIsLoading] = useState(false);

  const yearRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const dayRef = useRef<HTMLDivElement>(null);

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
    if (!yearRef.current) return;
    const itemHeight = 60;
    const scrollTop = yearRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (yearValues[index]) {
      setYear(yearValues[index]);
    }
  };

  const handleMonthScroll = () => {
    if (!monthRef.current) return;
    const itemHeight = 60;
    const scrollTop = monthRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (index >= 0 && index < 12) {
      setMonth(index);
    }
  };

  const handleDayScroll = () => {
    if (!dayRef.current) return;
    const itemHeight = 60;
    const scrollTop = dayRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    if (dayValues[index]) {
      setDay(dayValues[index]);
    }
  };

  // Initialize scroll positions
  useEffect(() => {
    if (yearRef.current) {
      const itemHeight = 60;
      const index = yearValues.indexOf(year);
      yearRef.current.scrollTop = index * itemHeight;
    }
    if (monthRef.current) {
      const itemHeight = 60;
      monthRef.current.scrollTop = month * itemHeight;
    }
    if (dayRef.current) {
      const itemHeight = 60;
      dayRef.current.scrollTop = (day - 1) * itemHeight;
    }
  }, []);

  const handleContinue = () => {
    // Don't proceed if under 18
    if (age < 18) {
      return;
    }

    setIsLoading(true);
    try {
      const birthdate = new Date(year, month, day);

      // Save to localStorage
      saveOnboardingData({
        birthdate: birthdate.toISOString()
      });

      router.push("/onboarding/target-weight");
    } catch (error) {
      console.error(error);
      alert("אירעה שגיאה, נסה שוב");
      setIsLoading(false);
    }
  };

  return (
    <OnboardingShell
      title="מתי נולדת?"
      subtitle={
        <>
          הגיל שלך משפיע על ההמלצות<br />שתקבלי באופן שוטף.
        </>
      }
      disableContentScroll={true}
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
            disabled={isLoading || age < 18}
            className="h-14 text-lg"
          >
            {isLoading ? "שומר..." : "הבא"}
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
