"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, startTransition } from "react";
import { getOnboardingData } from "@/lib/onboarding-storage";
import { saveOnboardingDraft } from "@/lib/onboarding/saveDraft";
import { queueDraftRetry } from "@/lib/onboarding/retryQueue";
import { useOnboardingNav } from "@/lib/onboarding/client";
import SpeedRecommendation from "@/components/SpeedRecommendation";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import OnboardingHeader from "../components/OnboardingHeader";
import { useOnboardingContext } from "../OnboardingContext";

export default function PacePage() {
  const router = useRouter();
  const [pace, setPace] = useState(0.8);
  const submittedRef = useRef(false);
  const [goalDirection, setGoalDirection] = useState<'gain' | 'lose'>('gain');
  const { nextHref } = useOnboardingNav("pace");
  const { getGenderedText } = useOnboardingGender();
  const { progress, handleBack } = useOnboardingContext();

  const MIN_PACE = 0.1;
  const MAX_PACE = 1.5;
  const STEP = 0.1;

  // Load user data on mount
  useEffect(() => {
    const data = getOnboardingData();
    const currentWeight = data.weight_kg || 0;
    const targetWeight = data.target_weight_kg || 0;
    const diff = targetWeight - currentWeight;
    setGoalDirection(diff >= 0 ? 'gain' : 'lose');

    // Load saved pace if exists
    if (data.pace) {
      setPace(parseFloat(data.pace));
    }
  }, []);

  // Calculate normalized position (0.0 to 1.0)
  const normalizedPosition = (pace - MIN_PACE) / (MAX_PACE - MIN_PACE);

  // Calculate fill percentage for slider (same as target-weight page)
  const fillPercentage = normalizedPosition * 100;
  const inactive = 'rgba(255,255,255,0.1)';

  const handleContinue = () => {
    if (submittedRef.current) return;
    submittedRef.current = true;

    // Navigate immediately
    startTransition(() => {
      router.push(nextHref);
    });

    // Save in background with retry queue
    saveOnboardingDraft({ pace: pace.toString() }).catch((error) => {
      console.error("Failed to save pace draft:", error);
      queueDraftRetry("pace", { pace: pace.toString() });
    });
  };

  const paceLabel = goalDirection === 'gain' ? 'קצב עלייה במשקל לשבוע' : 'קצב ירידה במשקל לשבוע';

  return (
    <div className="flex flex-col min-h-full relative">

      {/* Navigation bar */}
      <div className="flex items-center gap-4 px-5 pb-3 pt-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)' }}>
        {/* Progress Bar */}
        <div className="flex-1" dir="ltr">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/60 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={handleBack}
          className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-white/70 active:text-white active:scale-95 transition"
          aria-label="חזור"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Title and Subtitle */}
      <div className="px-6 pb-8 pt-2 flex-shrink-0">
        <OnboardingHeader
          title={
            <>
              באיזה קצב {getGenderedText("תרצה", "תרצי", "תרצה/י")}<br />להגיע למטרה?
            </>
          }
          subtitle={paceLabel}
        />
      </div>

      {/* Main Content - Add padding at bottom so content isn't hidden behind fixed footer */}
      <div className="flex-1 flex flex-col items-center justify-start px-6" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
        {/* Current Value Display */}
        <div className="mb-12">
          <p className="text-6xl font-bold text-white text-center leading-tight">
            {pace.toFixed(1)}
            <span className="text-xl text-white/60 mr-2">ק״ג</span>
          </p>
        </div>

        {/* Slider Container */}
        <div className="w-full max-w-sm px-6 mb-8">
          <div className="relative py-6 select-none">
            {/* Track with gradient (matches target-weight page) */}
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full"
              style={{
                height: '6px',
                background: `linear-gradient(to right, #fff 0%, #fff ${fillPercentage}%, ${inactive} ${fillPercentage}%, ${inactive} 100%)`
              }}
            />
            {/* Input slider */}
            <input
              type="range"
              min={MIN_PACE}
              max={MAX_PACE}
              step={STEP}
              value={pace}
              onChange={(e) => setPace(Number(e.target.value))}
              dir="ltr"
              aria-label="קצב לשבוע בקילוגרם"
              className="relative z-10 w-full h-8 appearance-none bg-transparent cursor-pointer slider"
            />
          </div>

          {/* Min/Max Labels */}
          <div className="flex justify-between text-white/40 text-sm font-medium px-1">
            <span>ק״ג 1.5</span>
            <span>ק״ג 0.1</span>
          </div>
        </div>

        {/* Speed Recommendation Chip */}
        <div className="w-full max-w-sm px-6 mb-4">
          <SpeedRecommendation weeklyKg={pace} recommendedKg={0.8} />
        </div>
      </div>

      {/* Continue Button - Fixed at bottom of viewport with spacing */}
      <footer
        className="fixed left-0 right-0 z-40 bg-[#0D0E0F] px-6 pt-3 border-t border-white/5"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
          paddingBottom: '0.75rem'
        }}
      >
        <button
          onClick={handleContinue}
          className="w-full h-14 bg-[#E2F163] text-black font-bold text-lg rounded-full transition hover:bg-[#d4e350] active:translate-y-1 active:brightness-90"
        >
          הבא
        </button>
      </footer>

      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #fff;
          border: 0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: transform 0.15s ease;
          margin-top: -11px;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.08);
        }

        .slider::-webkit-slider-thumb:active {
          transform: scale(1.12);
        }

        .slider::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          background: transparent;
          height: 6px;
        }

        .slider::-moz-range-thumb {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          background: #fff;
          border: 0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.08);
        }

        .slider::-moz-range-thumb:active {
          transform: scale(1.12);
        }

        .slider::-moz-range-track {
          background: transparent;
          height: 6px;
        }
      `}</style>
    </div>
  );
}
