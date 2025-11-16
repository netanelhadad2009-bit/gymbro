"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, startTransition } from "react";
import { saveOnboardingDraft } from "@/lib/onboarding/saveDraft";
import { queueDraftRetry } from "@/lib/onboarding/retryQueue";
import { useOnboardingNav } from "@/lib/onboarding/client";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

type DietType = "none" | "vegan" | "vegetarian" | "keto" | "paleo";

// Simple icon components
const UtensilsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
  </svg>
);

const LeafIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

const CarrotIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.27 21.7s9.87-3.5 12.73-6.36a4.5 4.5 0 0 0-6.36-6.37C5.77 11.84 2.27 21.7 2.27 21.7zM8.64 14l-2.05-2.04M15.34 15l-2.46-2.46" />
    <path d="M22 9s-1.33-2-3.5-2C16.86 7 15 9 15 9s1.33 2 3.5 2S22 9 22 9z" />
    <path d="M15 2s-2 1.33-2 3.5S15 9 15 9s2-1.84 2-3.5C17 3.33 15 2 15 2z" />
  </svg>
);

const FlameIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
);

const DrumstickIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12.5 20.5 2.5-2.5c.5-.5 1.5-1 2-1 1.5 0 2.5 1 2.5 2.5 0 .5-.5 1.5-1 2l-2.5 2.5c-.5.5-1.5 1-2 1-1.5 0-2.5-1-2.5-2.5 0-.5.5-1.5 1-2z" />
    <circle cx="8" cy="8" r="6" />
  </svg>
);

const iconMap: Record<string, () => JSX.Element> = {
  utensils: UtensilsIcon,
  leaf: LeafIcon,
  carrot: CarrotIcon,
  flame: FlameIcon,
  drumstick: DrumstickIcon,
};

export default function DietPage() {
  const router = useRouter();
  const [selectedDiet, setSelectedDiet] = useState<DietType | null>(null);
  const submittedRef = useRef(false);
  const { nextHref } = useOnboardingNav("diet");
  const { getGenderedText } = useOnboardingGender();

  const DIET_OPTIONS = [
    {
      key: "none" as DietType,
      label: getGenderedText("לא עוקב אחרי דיאטה מסוימת", "לא עוקבת אחרי דיאטה מסוימת", "לא עוקב/ת אחרי דיאטה מסוימת"),
      subtitle: "",
      icon: "utensils",
    },
    {
      key: "vegan" as DietType,
      label: getGenderedText("טבעוני", "טבעונית", "טבעוני/ת"),
      subtitle: "",
      icon: "leaf",
    },
    {
      key: "vegetarian" as DietType,
      label: getGenderedText("צמחוני", "צמחונית", "צמחוני/ת"),
      subtitle: "",
      icon: "carrot",
    },
    {
      key: "keto" as DietType,
      label: getGenderedText("קטוגני", "קטוגנית", "קטוגני/ת"),
      subtitle: "",
      icon: "flame",
    },
    {
      key: "paleo" as DietType,
      label: getGenderedText("פלאוליתי", "פלאוליתית", "פלאוליתי/ת"),
      subtitle: "",
      icon: "drumstick",
    },
  ];

  const handleContinue = () => {
    if (!selectedDiet) return;

    // Prevent double submissions
    if (submittedRef.current) return;
    submittedRef.current = true;

    const formData = { diet: selectedDiet };

    // 1) Navigate immediately (no loading state!)
    startTransition(() => {
      router.push(nextHref);
    });

    // 2) Save in background (fire-and-forget)
    (async () => {
      try {
        await saveOnboardingDraft(formData);
      } catch (error) {
        console.warn('[Diet] Background save failed:', error);
        // Queue for retry
        queueDraftRetry('diet', formData);
      }
    })();
  };

  return (
    <OnboardingShell
      title={
        <>
          {getGenderedText("אתה עוקב", "את עוקבת", "את/ה עוקב/ת")} אחרי דיאטה<br />מסוימת?
        </>
      }
      subtitle={
        <>
          התשובה {getGenderedText("שלך", "שלך", "שלך")} תעזור לנו להבין את<br />ההתנהלות התזונתית {getGenderedText("שלך", "שלך", "שלך")}.
        </>
      }
      footer={
        <PrimaryButton
          onClick={handleContinue}
          disabled={!selectedDiet}
          className="h-14 text-lg"
        >
          הבא
        </PrimaryButton>
      }
    >
      {/* Diet Cards */}
      <div className="pb-6">
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          {DIET_OPTIONS.map((option) => {
            const IconComponent = iconMap[option.icon];
            const isSelected = selectedDiet === option.key;

            return (
              <button
                key={option.key}
                onClick={() => setSelectedDiet(option.key)}
                className={[
                  "w-full rounded-3xl p-5 flex items-center gap-4 transition-all duration-150",
                  "active:translate-y-1 active:brightness-90 cursor-pointer",
                  isSelected
                    ? "bg-[#E2F163] text-black"
                    : "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/[0.07]",
                ].join(" ")}
              >
                {/* Text content - right side */}
                <div className="flex-1 text-right">
                  <div className="text-lg font-bold">{option.label}</div>
                  {option.subtitle && (
                    <div
                      className={`text-sm mt-1 ${
                        isSelected ? "text-black/70" : "text-white/60"
                      }`}
                    >
                      {option.subtitle}
                    </div>
                  )}
                </div>

                {/* Icon - left side (but visually on right in RTL) */}
                <div
                  className={[
                    "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
                    isSelected ? "bg-black/10" : "bg-white/10",
                  ].join(" ")}
                >
                  {IconComponent && <IconComponent />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </OnboardingShell>
  );
}
