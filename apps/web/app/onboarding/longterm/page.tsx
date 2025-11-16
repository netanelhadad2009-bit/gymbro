"use client";
import React, { useState, useEffect } from "react";
import AnimatedProgressChart from "@/components/onboarding/AnimatedProgressChart";
import { useRouter } from "next/navigation";
import { getNextStep, getStepPath } from "@/lib/onboarding/steps";
import { motion } from "framer-motion";
import OnboardingShell from "../components/OnboardingShell";
import PrimaryButton from "@/components/PrimaryButton";

export default function LongTermPage() {
  const router = useRouter();
  const [showButton, setShowButton] = useState(false);

  // Show button after chart animation completes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowButton(true);
    }, 2200); // After chart animation (1.8s + 0.4s buffer)

    return () => clearTimeout(timer);
  }, []);

  const handleNext = () => {
    const nextStep = getNextStep("longterm");
    if (nextStep) {
      router.push(getStepPath(nextStep));
    }
  };

  return (
    <OnboardingShell
      title={
        <>
          FitJourney יוצר תוצאות
          <br />
          לאורך זמן
        </>
      }
      subtitle="רוב המשתמשים שלנו שומרים על ההתקדמות שלהם גם אחרי חודשים ארוכים."
      footer={
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={showButton ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <PrimaryButton onClick={handleNext} className="h-14 text-lg">
            המשך
          </PrimaryButton>
        </motion.div>
      }
    >
      {/* CHART CARD - Single premium card */}
      <motion.section
        className="relative rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(22,22,22,0.75)] p-4 sm:p-6 mb-6 shadow-[0_10px_35px_rgba(0,0,0,0.55)] overflow-hidden"
        style={{
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        {/* Gradient stroke (single layer) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            background:
              "radial-gradient(120% 100% at 100% 0%, rgba(226,241,99,0.16) 0%, rgba(226,241,99,0.06) 35%, transparent 60%)",
          }}
        />

        {/* Subtle grid – very faint */}
        <svg
          className="absolute inset-0 opacity-10"
          width="100%"
          height="100%"
          aria-hidden
        >
          <defs>
            <pattern
              id="chart-grid"
              width="28"
              height="28"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 28 0 L 0 0 0 28"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#chart-grid)" />
        </svg>

        <div className="relative z-10">
          <AnimatedProgressChart rtl={true} accentColor="#E2F163" />
        </div>
      </motion.section>

      {/* STAT LINE - Emotional emphasis */}
      <motion.div
        className="rounded-[20px] bg-white/[0.04] border border-white/[0.06] px-5 py-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
      >
        <p className="text-[15px] text-white/85 leading-relaxed text-center">
          <span className="text-[#E2F163] font-bold text-[18px]">82%</span>{" "}
          ממשתמשי FitJourney שומרים על
          <br />
          ההישגים שלהם גם אחרי 6 חודשים.
        </p>
      </motion.div>
    </OnboardingShell>
  );
}
