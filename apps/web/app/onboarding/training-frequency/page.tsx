"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, startTransition } from "react";
import { saveOnboardingDraft } from "@/lib/onboarding/saveDraft";
import { queueDraftRetry } from "@/lib/onboarding/retryQueue";
import { useOnboardingNav } from "@/lib/onboarding/client";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";
import { Dot1Icon, Dot3Icon, Dot6Icon } from "@/components/icons/FrequencyDots";

export default function TrainingFrequencyPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<"low" | "medium" | "high" | null>(null);
  const submittedRef = useRef(false);
  const { nextHref } = useOnboardingNav("training-frequency");
  const { getGenderedText } = useOnboardingGender();

  const options = [
    {
      value: "low" as const,
      label: "0–2 אימונים",
      caption: "מתאמן לפעמים",
      icon: Dot1Icon,
    },
    {
      value: "medium" as const,
      label: "3–5 אימונים",
      caption: "מתאמן באופן קבוע",
      icon: Dot3Icon,
    },
    {
      value: "high" as const,
      label: "6+ אימונים",
      caption: "מתאמן מקצועי / ספורטאי ייעודי",
      icon: Dot6Icon,
    },
  ];

  const handleContinue = () => {
    if (!selected) return;

    // Prevent double submissions
    if (submittedRef.current) return;
    submittedRef.current = true;

    const formData = { training_frequency_actual: selected };

    // 1) Navigate immediately (no loading state!)
    startTransition(() => {
      router.push(nextHref);
    });

    // 2) Save in background (fire-and-forget)
    (async () => {
      try {
        await saveOnboardingDraft(formData);
      } catch (error) {
        console.warn('[TrainingFrequency] Background save failed:', error);
        // Queue for retry
        queueDraftRetry('training-frequency', formData);
      }
    })();
  };

  return (
    <OnboardingShell
      title={
        <>
          כמה אימונים {getGenderedText("אתה עושה", "את עושה", "את/ה עושה")}<br />בשבוע?
        </>
      }
      subtitle={
        <>
          זה יעזור לנו להבין את רמת הפעילות שלך<br />
          ולהתאים את התוכנית האישית.
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
      {/* Training Frequency Options */}
      <div className="pb-6">
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          {options.map((option) => {
            const IconComponent = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setSelected(option.value)}
                className={[
                  "w-full rounded-3xl p-5 flex items-center justify-between gap-4 transition-all duration-200",
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
                <div
                  className={[
                    "shrink-0 flex items-center justify-center w-12 h-12 rounded-xl transition-all",
                    selected === option.value
                      ? "bg-black/10 text-black/80"
                      : "bg-white/5 text-white/70",
                  ].join(" ")}
                >
                  <IconComponent size={28} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </OnboardingShell>
  );
}
