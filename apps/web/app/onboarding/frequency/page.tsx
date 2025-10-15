"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveOnboardingData } from "@/lib/onboarding-storage";
import { useOnboardingNav } from "@/lib/onboarding/client";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

export default function FrequencyPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<number>(3); // Default to 3 workouts
  const [isLoading, setIsLoading] = useState(false);
  const { nextHref } = useOnboardingNav("frequency");
  const { getGenderedText } = useOnboardingGender();

  const options = [
    { value: 2, label: "2 אימונים", caption: "קל להתמיד" },
    { value: 3, label: "3 אימונים", caption: "מאוזן למתחילים/מתקדמים" },
    { value: 4, label: "4 אימונים", caption: "קצב מתקדם" },
    { value: 5, label: "5 אימונים", caption: "קצב מאתגר" },
    { value: 6, label: "6 אימונים", caption: "ספורטאי/ת מחויב/ת" },
  ];

  const handleContinue = () => {
    if (!selected) return;

    setIsLoading(true);
    saveOnboardingData({ frequency: selected });
    router.push(nextHref);
  };

  return (
    <OnboardingShell
      title={
        <>
          כמה אימונים בשבוע<br />{getGenderedText("תרצה לעשות", "תרצי לעשות", "תרצה/י לעשות")}?
        </>
      }
      subtitle={
        <>
          זה יעזור לנו לתזמן את ימי האימון<br />
          בתוכנית המותאמת {getGenderedText("עבורך", "עבורך", "עבורך")}.
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
      {/* Frequency Options */}
      <div className="pb-6">
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelected(option.value)}
              className={[
                "w-full rounded-3xl p-5 flex items-center justify-between transition-all duration-200",
                "active:scale-95 cursor-pointer",
                selected === option.value
                  ? "bg-[#E2F163] text-black"
                  : "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/[0.07]",
              ].join(" ")}
            >
              <div className="text-right flex-1">
                <div className="text-lg font-bold">{option.label}</div>
                <div
                  className={`text-sm mt-1 ${
                    selected === option.value ? "text-black/70" : "text-white/60"
                  }`}
                >
                  {option.caption}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}
