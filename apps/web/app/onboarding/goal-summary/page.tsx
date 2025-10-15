"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getOnboardingData } from "@/lib/onboarding-storage";
import { useOnboardingNav } from "@/lib/onboarding/client";
import OnboardingHeader from "../components/OnboardingHeader";

export default function GoalSummaryPage() {
  const router = useRouter();
  const [currentWeight, setCurrentWeight] = useState(0);
  const [targetWeight, setTargetWeight] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { nextHref } = useOnboardingNav("goal-summary");

  // Load user data on mount
  useEffect(() => {
    const data = getOnboardingData();
    if (data.weight_kg) {
      setCurrentWeight(data.weight_kg);
    }
    if (data.target_weight_kg) {
      setTargetWeight(data.target_weight_kg);
    }
    setIsLoading(false);
  }, []);

  const handleContinue = () => {
    router.push(nextHref);
  };

  // Calculate weight difference
  const diff = targetWeight - currentWeight;
  const direction = diff >= 0 ? 'העלייה' : 'הירידה';
  const amount = Math.abs(diff);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center">
        <div className="text-white/60">טוען...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative overflow-hidden" style={{ height: 'calc(100vh - env(safe-area-inset-top, 0px) - 0.75rem)' }}>

      {/* Main Content - Centered vertically and horizontally */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-md text-center">
          <OnboardingHeader
            title={
              <>
                {direction} של{' '}
                <span className="text-[#E2F163]">{amount} ק"ג</span>{' '}
                היא מטרה מציאותית!
              </>
            }
            subtitle="90% מהמשתמשים מדווחים על תוצאות נראות לעין תוך זמן קצר — והשינוי נשאר לאורך זמן."
            className="mb-6"
          />
        </div>
      </div>

      {/* Continue Button - Fixed at bottom with spacing */}
      <footer
        className="fixed left-0 right-0 z-40 bg-[#0D0E0F] px-6 pt-3 border-t border-white/5"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
          paddingBottom: '0.75rem'
        }}
      >
        <button
          onClick={handleContinue}
          className="w-full h-14 bg-[#E2F163] text-black font-bold text-lg rounded-full transition hover:bg-[#d4e350] active:scale-[0.98]"
        >
          הבא
        </button>
      </footer>
    </div>
  );
}
