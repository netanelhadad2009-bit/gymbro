"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { saveOnboardingData, getOnboardingData } from "@/lib/onboarding-storage";
import { useOnboardingNav } from "@/lib/onboarding/client";
import SpeedRecommendation from "@/components/SpeedRecommendation";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import { supabase } from "@/lib/supabase";
import { getDays, getWorkout, getNutrition } from "@/lib/api-client";
import OnboardingHeader from "../components/OnboardingHeader";

export default function PacePage() {
  const router = useRouter();
  const [pace, setPace] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [goalDirection, setGoalDirection] = useState<'gain' | 'lose'>('gain');
  const { nextHref } = useOnboardingNav("pace");
  const { getGenderedText } = useOnboardingGender();

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

  // 🚀 Pre-generate workout and nutrition plans in the background
  useEffect(() => {
    let cancelled = false;

    const preGenerate = async () => {
      try {
        const profile = getOnboardingData();
        if (!profile || !profile.height_cm) {
          console.log("[PreGen] Missing profile data, skipping");
          return;
        }

        // Check if already pre-generated
        const existing = localStorage.getItem("pregenerated_plans");
        if (existing) {
          console.log("[PreGen] Plans already generated, skipping");
          return;
        }

        console.log("[PreGen] 🚀 Starting background plan generation...");

        // Calculate age from birthdate
        const age = profile.birthdate
          ? new Date().getFullYear() - new Date(profile.birthdate).getFullYear()
          : 28;

        // Map to API format
        const genderCode = profile.gender === "זכר" ? "male" : "female";
        const goalCode = profile.goals?.includes("ירידה במשקל") ? "loss" :
                         profile.goals?.includes("עלייה במסת שריר") ? "muscle" :
                         profile.goals?.includes("עלייה במשקל") ? "gain" : "loss";
        const activityCode = profile.activity === "מתחיל" ? "beginner" :
                            profile.activity === "בינוני" ? "intermediate" :
                            profile.activity === "מתקדם" ? "advanced" : "beginner";

        const todayISO = new Date().toISOString().slice(0, 10);

        // Get user ID
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        const userId = currentUser?.id || `guest-${Date.now()}`;

        // Calculate days
        const daysPromise = getDays({
          gender: genderCode,
          age: age,
          weight: profile.weight_kg || 75,
          targetWeight: profile.target_weight_kg || 70,
          heightCm: profile.height_cm,
          goal: goalCode,
          activityLevel: activityCode,
        });

        // Generate workout
        const workoutPromise = getWorkout({
          userId: userId,
          gender: genderCode,
          age: age,
          weight: profile.weight_kg || 75,
          targetWeight: profile.target_weight_kg || 70,
          heightCm: profile.height_cm,
          activityLevel: activityCode,
          experienceLevel: profile.experience || "בינוני",
          goal: profile.goals?.[0] || "שריפת שומן",
          workoutsPerWeek: profile.frequency || 3,
        });

        // Generate nutrition
        const nutritionPromise = getNutrition({
          gender: profile.gender || "זכר",
          age: age,
          heightCm: profile.height_cm,
          weight: profile.weight_kg || 75,
          targetWeight: profile.target_weight_kg || 70,
          activityDisplay: profile.activity || "בינוני",
          goalDisplay: profile.goals?.[0] || "שריפת שומן",
          startDateISO: todayISO,
        });

        // Wait for all to complete
        const [daysRes, workoutRes, nutritionRes] = await Promise.allSettled([
          daysPromise,
          workoutPromise,
          nutritionPromise
        ]);

        if (cancelled) return;

        // Extract results
        const days = daysRes.status === "fulfilled" && daysRes.value.ok ? daysRes.value.days : null;
        const workout = workoutRes.status === "fulfilled" && workoutRes.value.ok ? workoutRes.value : null;
        const nutrition = nutritionRes.status === "fulfilled" && nutritionRes.value.ok ? nutritionRes.value.json : null;

        // Store in localStorage
        const pregenerated = {
          days,
          workout: workout?.text,
          workoutPlan: workout?.plan,
          nutrition,
          timestamp: Date.now(),
          userId
        };

        localStorage.setItem("pregenerated_plans", JSON.stringify(pregenerated));
        console.log("[PreGen] ✅ Plans pre-generated and cached successfully!");
      } catch (err) {
        console.error("[PreGen] ❌ Pre-generation failed:", err);
        // Don't block the UI - generating page will handle it normally
      }
    };

    preGenerate();

    return () => {
      cancelled = true;
    };
  }, []);

  // Calculate normalized position (0.0 to 1.0)
  const normalizedPosition = (pace - MIN_PACE) / (MAX_PACE - MIN_PACE);

  // Calculate fill percentage for slider (same as target-weight page)
  const fillPercentage = normalizedPosition * 100;
  const inactive = 'rgba(255,255,255,0.1)';

  const handleContinue = () => {
    setIsLoading(true);
    saveOnboardingData({ pace: pace.toString() });
    router.push(nextHref);
  };

  const paceLabel = goalDirection === 'gain' ? 'קצב עלייה במשקל לשבוע' : 'קצב ירידה במשקל לשבוע';

  return (
    <div className="flex flex-col min-h-full relative">

      {/* Title and Subtitle */}
      <div className="px-6 pb-8 pt-4 flex-shrink-0">
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
          disabled={isLoading}
          className="w-full h-14 bg-[#E2F163] text-black font-bold text-lg rounded-full transition hover:bg-[#d4e350] active:scale-[0.98] disabled:opacity-50"
          aria-busy={isLoading}
        >
          {isLoading ? "שומר..." : "הבא"}
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
