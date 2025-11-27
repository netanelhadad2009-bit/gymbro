"use client";

/**
 * Auth Processing Page
 *
 * Shows a loading UI while running the post-auth flow in the background.
 * This allows for immediate navigation after signup/login, providing
 * better perceived performance.
 *
 * URL params:
 * - provider: 'email' | 'google' | 'apple'
 * - target: fallback route if post-auth fails (default: /journey)
 */

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { runPostAuthFlow } from "@/lib/auth/post-auth";
import { usePlatform } from "@/lib/platform";
import { getOnboardingDataOrNull } from "@/lib/onboarding-storage";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";

type Step = {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
};

const INITIAL_STEPS: Step[] = [
  { id: "profile", label: "שומר את הפרופיל שלך", status: "pending" },
  { id: "avatar", label: "מכין את המאמן האישי", status: "pending" },
  { id: "journey", label: "בונה את מסע הכושר", status: "pending" },
  { id: "finish", label: "מסיים הכנות", status: "pending" },
];

export default function AuthProcessingPage() {
  const searchParams = useSearchParams();
  const { storage } = usePlatform();
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const hasStarted = useRef(false);

  const provider = (searchParams.get("provider") || "email") as "email" | "google" | "apple";
  const fallbackTarget = searchParams.get("target") || "/journey";

  // Update step status
  const updateStep = (index: number, status: Step["status"]) => {
    setSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, status } : step
    ));
  };

  // Animate through steps for visual feedback
  useEffect(() => {
    if (currentStep < steps.length && !error) {
      updateStep(currentStep, "active");
    }
  }, [currentStep, error]);

  // Run post-auth flow
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    async function process() {
      try {
        // Step 1: Get session
        console.log("[AuthProcessing] Getting session...");
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          console.warn("[AuthProcessing] No session found, redirecting to login");
          window.location.href = "/login";
          return;
        }

        // Start visual progress
        setCurrentStep(0);
        updateStep(0, "active");

        // Get onboarding data
        const onboardingData = getOnboardingDataOrNull();
        console.log("[AuthProcessing] Onboarding data:", !!onboardingData);

        // Small delay for visual feedback on first step
        await new Promise(r => setTimeout(r, 300));
        updateStep(0, "done");
        setCurrentStep(1);

        // Step 2: Run post-auth flow (includes avatar, journey, etc.)
        console.log("[AuthProcessing] Running post-auth flow...");

        // Update visual steps as we progress
        const progressInterval = setInterval(() => {
          setCurrentStep(prev => {
            if (prev < 2) {
              updateStep(prev, "done");
              return prev + 1;
            }
            return prev;
          });
        }, 1500);

        const targetRoute = await runPostAuthFlow({
          user: session.user,
          session,
          provider,
          storage,
          supabase,
          onboardingDataOverride: onboardingData,
        });

        clearInterval(progressInterval);

        // Mark all steps as done
        steps.forEach((_, i) => updateStep(i, "done"));
        setCurrentStep(steps.length);

        console.log("[AuthProcessing] Post-auth completed, navigating to:", targetRoute);

        // Small delay to show completion
        await new Promise(r => setTimeout(r, 500));

        // Navigate to target
        window.location.href = targetRoute;

      } catch (err: any) {
        console.error("[AuthProcessing] Error:", err);
        setError(err?.message || "אירעה שגיאה בהכנת החשבון שלך");

        // Mark current step as error
        setSteps(prev => prev.map((step, i) =>
          i === currentStep ? { ...step, status: "error" } : step
        ));

        // Wait and redirect to fallback after error
        setTimeout(() => {
          console.log("[AuthProcessing] Redirecting to fallback:", fallbackTarget);
          window.location.href = fallbackTarget;
        }, 2000);
      }
    }

    process();
  }, [provider, storage, fallbackTarget]);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0D0E0F] text-white flex flex-col items-center justify-center px-6">
      {/* Logo/Brand */}
      <div className="mb-8">
        <div className="w-20 h-20 rounded-full bg-[#E2F163]/10 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-[#E2F163]" />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-2">
        מכינים את הכל בשבילך
      </h1>
      <p className="text-white/60 text-center mb-10">
        רק עוד כמה שניות...
      </p>

      {/* Steps */}
      <div className="w-full max-w-sm space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
              step.status === "active"
                ? "bg-white/10 scale-[1.02]"
                : step.status === "done"
                ? "bg-[#E2F163]/10"
                : step.status === "error"
                ? "bg-red-500/10"
                : "bg-white/5 opacity-50"
            }`}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
              {step.status === "active" ? (
                <Loader2 className="w-6 h-6 text-[#E2F163] animate-spin" />
              ) : step.status === "done" ? (
                <CheckCircle2 className="w-6 h-6 text-[#E2F163]" />
              ) : step.status === "error" ? (
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white text-sm">!</span>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-white/20" />
              )}
            </div>

            {/* Label */}
            <span
              className={`font-medium ${
                step.status === "active"
                  ? "text-white"
                  : step.status === "done"
                  ? "text-[#E2F163]"
                  : step.status === "error"
                  ? "text-red-400"
                  : "text-white/50"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-8 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl max-w-sm">
          <p className="text-red-400 text-center text-sm">{error}</p>
          <p className="text-white/50 text-center text-xs mt-2">
            ממשיכים לאפליקציה...
          </p>
        </div>
      )}
    </div>
  );
}
