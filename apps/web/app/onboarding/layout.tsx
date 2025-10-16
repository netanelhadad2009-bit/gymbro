/**
 * Shared onboarding layout with progress bar and navigation
 * Wraps all onboarding pages
 */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useMemo, useEffect, useRef } from "react";
import { STEP_INDEX, TOTAL_STEPS, type OnboardingStepId, getPrevStep, getStepPath } from "@/lib/onboarding/steps";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);

  // Extract current step ID from pathname
  const currentStepId = useMemo(() => {
    const segments = pathname.split("/");
    return segments[segments.length - 1] as OnboardingStepId;
  }, [pathname]);

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

  // Disable scrolling for specific pages
  const disableScroll = pathname.includes("/goal-summary");

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

  const stepIndex = STEP_INDEX[currentStepId];
  const stepNumber = stepIndex !== undefined ? stepIndex + 1 : 0;

  return (
    <div
      dir="rtl"
      className="min-h-[100svh] bg-[#0D0E0F] text-white flex flex-col"
    >
      {/* Top Navigation Bar - Fixed at top */}
      {!hideNavigation && (
        <header
          className="fixed top-0 left-0 right-0 z-50 bg-[#0D0E0F]/95 backdrop-blur-sm border-b border-white/5"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          {/* Back Button and Progress Bar in same row */}
          <div className="flex items-center gap-4 p-5 pb-3">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-white/70 active:text-white active:scale-95 transition"
              aria-label="חזור"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Progress Bar */}
            <div className="flex-1">
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white/60 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Page Content - Conditionally scrollable */}
      <div
        ref={contentRef}
        className={`flex-1 ${disableScroll ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{
          paddingTop: !hideNavigation ? 'calc(env(safe-area-inset-top, 0px) + 4.5rem)' : '0',
        }}
      >
        {children}
      </div>
    </div>
  );
}
