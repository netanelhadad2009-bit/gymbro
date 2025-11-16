"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveOnboardingData } from "@/lib/onboarding-storage";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

export default function ExperiencePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const { getGenderedText } = useOnboardingGender();

  const experienceOptions = [
    {
      value: "never",
      label: "לא הצלחתי להתמיד לאורך זמן"
    },
    {
      value: "results",
      label: "לא הצלחתי לראות תוצאות"
    },
    {
      value: "knowledge",
      label: "אין לי מספיק ידע תזונתי"
    },
    {
      value: "time",
      label: "לא מצאתי מספיק זמן"
    },
    {
      value: "sure",
      label: getGenderedText("אני לא בטוח", "אני לא בטוחה", "אני לא בטוח/ה")
    },
  ];

  const handleContinue = () => {
    if (!selected) return;

    // Save to localStorage
    saveOnboardingData({ experience: selected });

    // Navigate to the next step (motivation)
    router.push("/onboarding/motivation");
  };

  const titleNode = (
    <>
      מה עצר אותך עד עכשיו<br />
      {getGenderedText("מלהגיע למטרה שלך?", "מלהגיע למטרה שלך?", "מלהגיע למטרה שלך?")}
    </>
  );

  return (
    <OnboardingShell
      title={titleNode}
      subtitle={
        <>
          התשובה שלך תעזור לנו להציע פתרון<br />
          שיהיה מדוייק בשבילך.
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
      <div className="space-y-3">
        {experienceOptions.map((option) => (
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
