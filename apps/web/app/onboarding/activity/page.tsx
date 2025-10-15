"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveOnboardingData } from "@/lib/onboarding-storage";
import { useOnboardingNav } from "@/lib/onboarding/client";
import ActivityCard from "@/components/ActivityCard";
import { useOnboardingGender } from "@/lib/onboarding/useOnboardingGender";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

type ActivityLevel = "sedentary" | "light" | "high";

export default function ActivityPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<ActivityLevel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { nextHref } = useOnboardingNav("activity");
  const { getGenderedText } = useOnboardingGender();

  const ACTIVITY_OPTIONS = [
    {
      key: "sedentary" as ActivityLevel,
      title: "כמעט בלי תנועה",
      subtitle: getGenderedText("יושב רוב היום", "יושבת רוב היום", "יושב/ת רוב היום"),
      bars: 1 as const,
    },
    {
      key: "light" as ActivityLevel,
      title: "תנועה קלה",
      subtitle: getGenderedText("זז קצת במהלך היום", "זזה קצת במהלך היום", "זז/ה קצת במהלך היום"),
      bars: 2 as const,
    },
    {
      key: "high" as ActivityLevel,
      title: "תנועה גבוהה",
      subtitle: getGenderedText("עובד פיזית או כל היום על הרגליים", "עובדת פיזית או כל היום על הרגליים", "עובד/ת פיזית או כל היום על הרגליים"),
      bars: 3 as const,
    },
  ];

  const handleContinue = () => {
    if (!selected) return;

    setIsLoading(true);
    saveOnboardingData({ activity: selected });
    router.push(nextHref);
  };

  const handleKeyDown = (e: React.KeyboardEvent, activityKey: ActivityLevel) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSelected(activityKey);
    }
  };

  return (
    <OnboardingShell
      title={
        <>
          מהי רמת הפעילות<br />היומית שלך?
        </>
      }
      subtitle={
        <>
          התשובה שלך תעזור לנו להתאים את<br />התפריט בדיוק בשבילך.
        </>
      }
      footer={
        <PrimaryButton
          onClick={handleContinue}
          disabled={!selected || isLoading}
          className="h-14 text-lg"
        >
          {isLoading ? "שומר..." : "הבא"}
        </PrimaryButton>
      }
    >
      {/* Activity Cards */}
      <div className="pb-6">
        <div
          role="radiogroup"
          aria-label="רמת פעילות יומית"
          className="flex flex-col gap-4 max-w-md mx-auto"
        >
          {ACTIVITY_OPTIONS.map((option) => (
            <div
              key={option.key}
              onKeyDown={(e) => handleKeyDown(e, option.key)}
              tabIndex={0}
            >
              <ActivityCard
                title={option.title}
                subtitle={option.subtitle}
                selected={selected === option.key}
                bars={option.bars}
                onSelect={() => setSelected(option.key)}
              />
            </div>
          ))}
        </div>
      </div>
    </OnboardingShell>
  );
}
