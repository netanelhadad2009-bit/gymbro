/**
 * Client-side onboarding navigation hook
 * Use this in onboarding pages to get navigation paths
 */

import { useMemo } from "react";
import { getNextStep, getPrevStep, getStepPath, type OnboardingStepId } from "./steps";

export function useOnboardingNav(current: OnboardingStepId) {
  return useMemo(() => {
    const next = getNextStep(current);
    const prev = getPrevStep(current);
    return {
      nextHref: next ? getStepPath(next) : "/dashboard",
      prevHref: prev ? getStepPath(prev) : "/",
      hasNext: next !== null,
      hasPrev: prev !== null,
    };
  }, [current]);
}
