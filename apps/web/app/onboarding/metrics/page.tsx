"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { saveOnboardingData, getOnboardingData } from "@/lib/onboarding-storage";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

export default function MetricsPage() {
  const router = useRouter();
  const [height, setHeight] = useState(173);
  const [weight, setWeight] = useState(55);
  const [isLoading, setIsLoading] = useState(false);

  const heightRef = useRef<HTMLDivElement>(null);
  const weightRef = useRef<HTMLDivElement>(null);

  // Load saved data on mount
  useEffect(() => {
    const data = getOnboardingData();
    if (data.height_cm) {
      setHeight(data.height_cm);
    }
    if (data.weight_kg) {
      setWeight(data.weight_kg);
    }
  }, []);

  // Calculate BMI
  const bmi = weight / Math.pow(height / 100, 2);

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return "תת משקל";
    if (bmi < 25) return "תקין";
    if (bmi < 30) return "עודף";
    return "השמנה";
  };

  const getBMIColor = (bmi: number): { bg: string; text: string; indicator: string } => {
    if (bmi < 18.5) return { bg: "#b8c5ff", text: "#5B6CFF", indicator: "#5B6CFF" }; // Blue - underweight
    if (bmi < 25) return { bg: "#b0f4d7", text: "#18C37D", indicator: "#18C37D" }; // Green - normal
    if (bmi < 30) return { bg: "#ffd9a3", text: "#FFA323", indicator: "#FFA323" }; // Orange - overweight
    return { bg: "#ffc2c2", text: "#E5484D", indicator: "#E5484D" }; // Red - obese
  };

  const getBMIPosition = (bmi: number): number => {
    // Map BMI 14-40 to 0-100%
    const clampedBMI = Math.max(14, Math.min(40, bmi));
    return ((clampedBMI - 14) / (40 - 14)) * 100;
  };

  const handleHeightScroll = () => {
    if (!heightRef.current) return;
    const itemHeight = 60;
    const scrollTop = heightRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const newHeight = 140 + index;
    if (newHeight >= 140 && newHeight <= 210) {
      setHeight(newHeight);
    }
  };

  const handleWeightScroll = () => {
    if (!weightRef.current) return;
    const itemHeight = 60;
    const scrollTop = weightRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const newWeight = 40 + index;
    if (newWeight >= 40 && newWeight <= 200) {
      setWeight(newWeight);
    }
  };

  // Initialize scroll positions
  useEffect(() => {
    if (heightRef.current) {
      const itemHeight = 60;
      heightRef.current.scrollTop = (height - 140) * itemHeight;
    }
    if (weightRef.current) {
      const itemHeight = 60;
      weightRef.current.scrollTop = (weight - 40) * itemHeight;
    }
  }, []);

  const handleContinue = () => {
    setIsLoading(true);
    try {
      // Save to localStorage for guest users
      saveOnboardingData({
        height_cm: height,
        weight_kg: weight,
        bmi: parseFloat(bmi.toFixed(1))
      });

      router.push("/onboarding/birthdate");
    } catch (error) {
      console.error("Error saving data:", error);
      alert("אירעה שגיאה, נסה שוב");
      setIsLoading(false);
    }
  };

  const heightValues = Array.from({ length: 71 }, (_, i) => 140 + i);
  const weightValues = Array.from({ length: 161 }, (_, i) => 40 + i);

  return (
    <OnboardingShell
      title={
        <>
          מה הגובה והמשקל<br />שלך?
        </>
      }
      subtitle={
        <>
          נתחשב בזה כדי לחשב את<br />נקודת הפתיחה המותאמת שלך.
        </>
      }
      disableContentScroll={true}
      footer={
        <PrimaryButton
          onClick={handleContinue}
          disabled={isLoading}
          className="h-14 text-lg"
        >
          {isLoading ? "שומר..." : "הבא"}
        </PrimaryButton>
      }
    >
      {/* Pickers */}
      <div className="flex gap-4 justify-center mb-6">
        {/* Weight Picker */}
        <div className="flex flex-col items-center">
          <p className="text-white/70 text-sm mb-2">משקל</p>
          <div className="relative w-28">
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0e0f12] to-transparent" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 bg-white/5 rounded-2xl border border-white/20" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e0f12] to-transparent" />
            </div>
            <div
              ref={weightRef}
              onScroll={handleWeightScroll}
              className="h-48 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
              <div className="h-16" />
              {weightValues.map((w) => (
                <div
                  key={w}
                  className="h-[60px] flex items-center justify-center snap-center"
                >
                  <span className={`text-xl transition-all ${
                    w === weight ? "font-bold text-white scale-110" : "text-white/30"
                  }`}>
                    {w} ק״ג
                  </span>
                </div>
              ))}
              <div className="h-16" />
            </div>
          </div>
        </div>

        {/* Height Picker */}
        <div className="flex flex-col items-center">
          <p className="text-white/70 text-sm mb-2">גובה</p>
          <div className="relative w-28">
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0e0f12] to-transparent" />
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 bg-white/5 rounded-2xl border border-white/20" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0e0f12] to-transparent" />
            </div>
            <div
              ref={heightRef}
              onScroll={handleHeightScroll}
              className="h-48 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
            >
              <div className="h-16" />
              {heightValues.map((h) => (
                <div
                  key={h}
                  className="h-[60px] flex items-center justify-center snap-center"
                >
                  <span className={`text-xl transition-all ${
                    h === height ? "font-bold text-white scale-110" : "text-white/30"
                  }`}>
                    {h} ס״מ
                  </span>
                </div>
              ))}
              <div className="h-16" />
            </div>
          </div>
        </div>
      </div>

      {/* BMI Card & Bar Combined */}
      <div className="px-6 mb-8">
        <div className="max-w-xs mx-auto space-y-3">
          {/* BMI Display Card */}
          <div
            className="rounded-3xl py-4 px-6 text-center transition-colors duration-300"
            style={{ backgroundColor: getBMIColor(bmi).bg }}
          >
            <p className="text-xs text-gray-600 mb-0.5">BMI</p>
            <p
              className="text-3xl font-bold mb-0.5 transition-colors duration-300"
              style={{ color: getBMIColor(bmi).text }}
            >
              {bmi.toFixed(1)}
            </p>
            <p
              className="text-xs font-semibold transition-colors duration-300"
              style={{ color: getBMIColor(bmi).text }}
            >
              {getBMICategory(bmi)}
            </p>
          </div>

          {/* BMI Bar with Indicator */}
          <div className="relative">
            {/* Triangle Indicator */}
            <div
              className="absolute -top-2.5 transition-all duration-300 z-10"
              style={{ right: `calc(${getBMIPosition(bmi)}% - 6px)` }}
            >
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path
                  d="M6 0L12 10H0L6 0Z"
                  fill={getBMIColor(bmi).indicator}
                  className="transition-colors duration-300"
                />
              </svg>
            </div>

            {/* Colored Bar */}
            <div className="h-2.5 rounded-full overflow-hidden flex shadow-md">
              <div className="flex-1 bg-[#5B6CFF]" />
              <div className="flex-1 bg-[#18C37D]" />
              <div className="flex-1 bg-[#FFA323]" />
              <div className="flex-1 bg-[#E5484D]" />
            </div>

            {/* Labels */}
            <div className="flex justify-between mt-2 text-[10px] text-white/60">
              <span>תת משקל</span>
              <span>תקין</span>
              <span>עודף</span>
              <span>השמנה</span>
            </div>
          </div>
        </div>
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
