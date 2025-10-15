"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { saveOnboardingData, getOnboardingData } from "@/lib/onboarding-storage";
import { useOnboardingNav } from "@/lib/onboarding/client";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

export default function TargetWeightPage() {
  const router = useRouter();
  const [targetWeight, setTargetWeight] = useState(70);
  const [currentWeight, setCurrentWeight] = useState(70);
  const [isLoading, setIsLoading] = useState(false);
  const { nextHref } = useOnboardingNav("target-weight");
  const { getGenderedText } = useOnboardingGender();

  const MIN_WEIGHT = 40;
  const MAX_WEIGHT = 120;

  // Thumb sizing constants
  const THUMB = 24; // px
  const THUMB_HALF = THUMB / 2;

  // Calculate fill percentage
  const pct = ((targetWeight - MIN_WEIGHT) / (MAX_WEIGHT - MIN_WEIGHT)) * 100;
  const inactive = 'rgba(255,255,255,0.2)';

  // Load user data on mount
  useEffect(() => {
    const data = getOnboardingData();

    // Set current weight from saved data
    if (data.weight_kg) {
      setCurrentWeight(data.weight_kg);
    }

    // Set target weight: use saved target if exists, otherwise use current weight
    if (data.target_weight_kg) {
      setTargetWeight(data.target_weight_kg);
    } else if (data.weight_kg) {
      setTargetWeight(data.weight_kg);
    }
  }, []);

  const handleContinue = () => {
    setIsLoading(true);
    saveOnboardingData({ target_weight_kg: targetWeight });
    router.push(nextHref);
  };

  return (
    <OnboardingShell
      title={`מה משקל היעד ${getGenderedText("שלך", "שלך", "שלך")}?`}
      subtitle={
        <>
          כדי לדעת לאן לכוון – חשוב שנכיר<br />את היעד {getGenderedText("שלך", "שלך", "שלך")}.
        </>
      }
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
      {/* Weight Display */}
      <div className="flex flex-col items-center justify-center">
        <div className="mb-16">
          <p className="text-7xl font-bold text-white text-center leading-tight">
            {targetWeight}
            <span className="text-2xl text-white/60 mr-2">ק״ג</span>
          </p>
        </div>

        {/* Slider */}
        <div className="w-full max-w-sm px-6">
          <div className="relative py-4 select-none">
            {/* Track with gradient */}
            <div
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-full"
              style={{
                height: '5px',
                background: `linear-gradient(to right, #fff 0%, #fff ${pct}%, ${inactive} ${pct}%, ${inactive} 100%)`
              }}
            />
            {/* Input slider */}
            <input
              type="range"
              min={MIN_WEIGHT}
              max={MAX_WEIGHT}
              step={1}
              value={targetWeight}
              onChange={(e) => setTargetWeight(Number(e.target.value))}
              dir="ltr"
              className="relative z-10 w-full h-6 appearance-none bg-transparent cursor-pointer slider"
            />
          </div>

          {/* Min/Max Labels */}
          <div className="flex justify-between text-white/40 text-sm font-medium px-1">
            <span>120 ק״ג</span>
            <span>40 ק״ג</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          outline: none;
        }

        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: #fff;
          border: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: transform 0.15s ease;
          margin-top: -8.5px;
        }

        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.05);
        }

        .slider::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }

        .slider::-webkit-slider-runnable-track {
          -webkit-appearance: none;
          background: transparent;
          height: 5px;
        }

        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          background: #fff;
          border: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: transform 0.15s ease;
        }

        .slider::-moz-range-thumb:hover {
          transform: scale(1.05);
        }

        .slider::-moz-range-thumb:active {
          transform: scale(1.1);
        }

        .slider::-moz-range-track {
          background: transparent;
          height: 5px;
        }
      `}</style>
    </OnboardingShell>
  );
}
