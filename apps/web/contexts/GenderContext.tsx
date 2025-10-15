"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Gender = "male" | "female" | "other" | null;

interface GenderContextType {
  gender: Gender;
  setGender: (gender: Gender) => void;
  getGenderedText: (maleText: string, femaleText: string, defaultText?: string) => string;
}

const GenderContext = createContext<GenderContextType | undefined>(undefined);

export function GenderProvider({ children }: { children: ReactNode }) {
  const [gender, setGender] = useState<Gender>(null);
  const pathname = usePathname();

  // Check if we're in the onboarding flow
  const isOnboarding = pathname?.startsWith('/onboarding');

  useEffect(() => {
    // Skip Supabase calls during onboarding
    if (isOnboarding) {
      return;
    }

    // Load gender from Supabase on mount
    const loadGender = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.gender) {
          setGender(user.user_metadata.gender);
        }
      } catch (error) {
        // Silently fail if user is not authenticated
        console.log("User not authenticated yet");
      }
    };
    loadGender();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.user_metadata?.gender) {
        setGender(session.user.user_metadata.gender);
      }
    });

    return () => subscription.unsubscribe();
  }, [isOnboarding]);

  const getGenderedText = (maleText: string, femaleText: string, otherText?: string) => {
    if (gender === "male") return maleText;
    if (gender === "female") return femaleText;
    if (gender === "other") return otherText || `${femaleText}/${maleText}`;
    return otherText || `${femaleText}/${maleText}`; // default to both forms if not set
  };

  return (
    <GenderContext.Provider value={{ gender, setGender, getGenderedText }}>
      {children}
    </GenderContext.Provider>
  );
}

export function useGender() {
  const context = useContext(GenderContext);
  if (context === undefined) {
    throw new Error("useGender must be used within a GenderProvider");
  }
  return context;
}
