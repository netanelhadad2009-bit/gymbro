"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveOnboardingData } from "@/lib/onboarding-storage";
import { useOnboardingNav } from "@/lib/onboarding/client";
import { useGender } from "@/contexts/GenderContext";
import texts from "@/lib/assistantTexts";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

const goalOptions = [
  {
    value: "muscle_gain",
    labelKey: "muscleGain" as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 12h11M9 8.5L12 5.5l3 3M9 15.5l3 3 3-3"/>
        <path d="M5 12h1M18 12h1M12 5v1M12 18v1"/>
      </svg>
    ),
  },
  {
    value: "weight_loss",
    labelKey: "weightLoss" as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5L12 18l3.5-3.5M12 4v14"/>
      </svg>
    ),
  },
  {
    value: "body_maintenance",
    labelKey: "bodyMaintenance" as const,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M2 12h20"/>
        <circle cx="12" cy="12" r="9"/>
      </svg>
    ),
  },
];

export default function GoalsPage() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getGenderedText } = useGender();
  const { nextHref } = useOnboardingNav("goals");

  const handleContinue = () => {
    if (!selectedGoal) return;

    setIsLoading(true);
    saveOnboardingData({ goals: [selectedGoal] });
    router.push(nextHref);
  };

  const titleNode = (
    <>
      {getGenderedText(texts.onboardingGoals.title, texts.onboardingGoals.titleFemale, texts.onboardingGoals.titleNeutral)}<br />{texts.onboardingGoals.withGymBro}
    </>
  );

  return (
    <OnboardingShell
      title={<h1 className="text-3xl font-bold text-center mb-4">{titleNode}</h1>}
      subtitle={texts.onboardingGoals.subtitle}
      footer={
        <PrimaryButton
          onClick={handleContinue}
          disabled={!selectedGoal || isLoading}
          className="h-14 text-lg"
        >
          {isLoading ? texts.general.saving : texts.general.next}
        </PrimaryButton>
      }
    >
      <div className="flex flex-col gap-3 max-w-md mx-auto">
        {goalOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelectedGoal(option.value)}
            className={[
              "w-full rounded-3xl p-5 flex items-center gap-4 transition-all duration-150",
              "active:scale-[0.98] cursor-pointer",
              selectedGoal === option.value
                ? "bg-[#E2F163] text-black"
                : "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/[0.07]",
            ].join(" ")}
          >
            <div className="flex-1 text-right">
              <div className="text-lg font-bold">{texts.onboardingGoals[option.labelKey]}</div>
            </div>
            <div
              className={[
                "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                selectedGoal === option.value ? "bg-black/10" : "bg-white/10",
              ].join(" ")}
            >
              {option.icon}
            </div>
          </button>
        ))}
      </div>
    </OnboardingShell>
  );
}
