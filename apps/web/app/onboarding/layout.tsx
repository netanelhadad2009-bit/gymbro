/**
 * Shared onboarding layout with progress bar and navigation
 * Wraps all onboarding pages
 */

"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useEffect, useRef } from "react";
import { STEP_INDEX, TOTAL_STEPS, type OnboardingStepId, getPrevStep, getStepPath } from "@/lib/onboarding/steps";
import { OnboardingProvider } from "./OnboardingContext";
import { track } from "@/lib/mixpanel";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const lastTrackedStep = useRef<string | null>(null);

  // Extract current step ID from pathname
  const currentStepId = useMemo(() => {
    const segments = pathname.split("/");
    return segments[segments.length - 1] as OnboardingStepId;
  }, [pathname]);

  // [analytics] Track onboarding step viewed
  useEffect(() => {
    if (currentStepId && currentStepId !== lastTrackedStep.current) {
      lastTrackedStep.current = currentStepId;
      track("onboarding_step_viewed", {
        step_name: currentStepId,
        step_index: STEP_INDEX[currentStepId] ?? -1,
      });
    }
  }, [currentStepId]);

  // Reset scroll position when navigating between pages
  useEffect(() => {
    // Reset the content container scroll
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    // Also reset window scroll
    window.scrollTo(0, 0);

    // Reset any other scrollable elements
    const scrollableElements = document.querySelectorAll('[class*="overflow"]');
    scrollableElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        element.scrollTop = 0;
      }
    });
  }, [pathname]);

  // Hide navigation for generating, preview, and reminders pages
  const hideNavigation = pathname.includes("/generating") || pathname.includes("/preview") || pathname.includes("/reminders");

  // Calculate progress
  const progress = useMemo(() => {
    const stepIndex = STEP_INDEX[currentStepId];
    if (stepIndex === undefined) return 0;
    return ((stepIndex + 1) / TOTAL_STEPS) * 100;
  }, [currentStepId]);

  // Get previous step
  const prevStep = useMemo(() => {
    return getPrevStep(currentStepId);
  }, [currentStepId]);

  const handleBack = () => {
    if (prevStep) {
      router.push(getStepPath(prevStep));
    } else {
      router.push("/");
    }
  };

  // Wrap children with context provider to share navigation state
  return (
    <OnboardingProvider
      hideNavigation={hideNavigation}
      progress={progress}
      handleBack={handleBack}
    >
      {children}
    </OnboardingProvider>
  );
}
