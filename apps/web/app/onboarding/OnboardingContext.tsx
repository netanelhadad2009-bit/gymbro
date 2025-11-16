"use client";

import React, { createContext, useContext } from "react";

interface OnboardingContextType {
  hideNavigation: boolean;
  progress: number;
  handleBack: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({
  children,
  hideNavigation,
  progress,
  handleBack
}: {
  children: React.ReactNode;
  hideNavigation: boolean;
  progress: number;
  handleBack: () => void;
}) {
  return (
    <OnboardingContext.Provider value={{ hideNavigation, progress, handleBack }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboardingContext must be used within OnboardingProvider");
  }
  return context;
}