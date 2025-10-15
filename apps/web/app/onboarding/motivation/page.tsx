"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveOnboardingData } from "@/lib/onboarding-storage";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

export default function MotivationPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const { getGenderedText } = useOnboardingGender();

  const motivationOptions = [
    {
      value: "better_habits",
      label: "להרגיש טוב יותר בבגדים שלי"
    },
    {
      value: "energy_confidence",
      label: "להיות עם יותר אנרגיה וביטחון"
    },
    {
      value: "eat_right",
      label: "לאכול נכון ולהתמיד בזה"
    },
    {
      value: "improve_health",
      label: "לשפר את הבריאות שלי"
    },
    {
      value: "change_appearance",
      label: "לשנות את המראה החיצוני"
    },
  ];

  const handleContinue = () => {
    if (!selected) return;

    // Save to localStorage
    saveOnboardingData({ motivation: selected });

    router.push("/onboarding/longterm");
  };

  return (
    <OnboardingShell
      title={
        <>
          {getGenderedText("מה יגרום לך להרגיש", "מה יגרום לך להרגיש", "מה יגרום לך להרגיש")}<br />
          {getGenderedText("שהשגת את המטרה?", "שהשגת את המטרה?", "שהשגת את המטרה?")}
        </>
      }
      subtitle={
        <>
          התשובה {getGenderedText("שלך", "שלך", "שלך")} תעזור לנו לוודא {getGenderedText("שאתה", "שאת", "שאת/ה")}<br />
          באמת {getGenderedText("מרגיש", "מרגישה", "מרגיש/ה")} את ההבדל.
        </>
      }
      footer={
        <PrimaryButton
          onClick={handleContinue}
          disabled={!selected}
          className="h-14 text-lg"
        >
          הבא
        </PrimaryButton>
      }
    >
      {/* Motivation Options */}
      <div className="space-y-3">
        {motivationOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setSelected(option.value)}
            className={`w-full min-h-[60px] rounded-2xl flex items-center px-6 transition-all ${
              selected === option.value
                ? "bg-[#E2F163] text-black"
                : "bg-white/5 text-white"
            }`}
          >
            <span className="text-base font-medium text-right">{option.label}</span>
          </button>
        ))}
      </div>
    </OnboardingShell>
  );
}
