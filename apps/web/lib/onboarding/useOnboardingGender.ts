/**
 * Hook for getting gendered text during onboarding flow
 * Uses localStorage since user isn't authenticated yet
 */

import { useState, useEffect } from "react";
import { getOnboardingData } from "@/lib/onboarding-storage";

type Gender = "male" | "female" | "other" | null;

export function useOnboardingGender() {
  const [gender, setGender] = useState<Gender>(null);

  useEffect(() => {
    const data = getOnboardingData();
    if (data.gender) {
      setGender(data.gender as Gender);
    }
  }, []);

  const getGenderedText = (maleText: string, femaleText: string, otherText?: string) => {
    if (gender === "male") return maleText;
    if (gender === "female") return femaleText;
    if (gender === "other") return otherText || `${femaleText}/${maleText}`;
    return otherText || `${femaleText}/${maleText}`; // default to both forms if not set
  };

  return { gender, getGenderedText };
}
