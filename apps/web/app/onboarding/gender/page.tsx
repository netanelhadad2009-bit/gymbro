"use client";

import { saveOnboardingData } from "@/lib/onboarding-storage";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGender } from "@/contexts/GenderContext";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";
import { track } from "@/lib/mixpanel";
import AppsFlyer from "@/lib/appsflyer";
import { getDeviceId } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

const genderOptions = [
  { value: "male", label: "זכר" },
  { value: "female", label: "נקבה" },
  { value: "other", label: "אחר" },
];

export default function GenderPage() {
  const router = useRouter();
  const [selectedGender, setSelectedGender] = useState("female");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { setGender } = useGender();

  // Track onboarding started (only once per session)
  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (!hasTrackedRef.current) {
      hasTrackedRef.current = true;
      track("onboarding_started", {});
      AppsFlyer.logEvent("onboarding_started", {});

      // [sheets] Fire-and-forget: Log anonymous onboarding start to Google Sheets
      // Only track if user is NOT logged in (anonymous users who start before signup)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          fetch("/api/admin/onboarding-start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              device_id: getDeviceId(),
              created_at: new Date().toISOString(),
            }),
          }).catch(() => {}); // Ignore errors - best effort
        }
      });
    }
  }, []);

  useEffect(() => {
    // Center the female option on mount
    if (scrollRef.current) {
      const itemHeight = 80;
      scrollRef.current.scrollTop = itemHeight;
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const itemHeight = 80;
    const scrollTop = scrollRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);

    if (genderOptions[index]) {
      setSelectedGender(genderOptions[index].value);
    }
  };

  const handleContinue = () => {
    setGender(selectedGender as "male" | "female" | "other");
    saveOnboardingData({ gender: selectedGender });
    router.push("/onboarding/goals");
  };

  const titleText = selectedGender === "male" ? "בחר מין" : selectedGender === "female" ? "בחרי מין" : "בחר/י מין";
  const subtitleText = `נשתמש בזה כדי להתאים את התוכנית האישית ${selectedGender === "male" ? "שלך" : selectedGender === "female" ? "שלך" : "שלך"}.`;

  return (
    <OnboardingShell
      title={titleText}
      subtitle={subtitleText}
      disableContentScroll={true}
      footer={
        <PrimaryButton onClick={handleContinue} className="h-14 text-lg">
          הבא
        </PrimaryButton>
      }
    >
      {/* iOS-style Picker */}
      <div className="flex items-center justify-center relative py-8">
        {/* Highlight Bar */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-20 bg-white/5 border-y-2 border-white/10 pointer-events-none z-10" />

        {/* Scrollable Options */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-60 w-full max-w-xs overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
          style={{ scrollSnapType: "y mandatory" }}
        >
          {/* Top spacer */}
          <div className="h-20" />

          {genderOptions.map((option) => (
            <div
              key={option.value}
              className="h-20 flex items-center justify-center snap-center transition-all duration-200"
              style={{
                opacity: selectedGender === option.value ? 1 : 0.3,
                transform: selectedGender === option.value ? "scale(1.1)" : "scale(0.9)",
              }}
            >
              <span className="text-2xl font-bold">
                {option.label}
              </span>
            </div>
          ))}

          {/* Bottom spacer */}
          <div className="h-20" />
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </OnboardingShell>
  );
}
