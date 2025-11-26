"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import OnboardingHeader from "../components/OnboardingHeader";
import { supabase } from "@/lib/supabase";
import { getPushStatus } from '@/lib/notifications/permissions';
import { saveOnboardingData } from "@/lib/onboarding-storage";

type Point = { label: string; weight: number; days: number };

function buildProjection(
  current: number,
  target: number,
  pacePerWeek: number
): Point[] {
  const days = [3, 7, 30, 60];
  const perDay = pacePerWeek / 7; // kg per day (+/-)
  const arr = days.map((d) => ({
    label: d === 3 ? "3 ימים" : d === 7 ? "7 ימים" : `${d} ימים`,
    weight: Number((current + perDay * d).toFixed(1)),
    days: d,
  }));

  // Calculate days to reach target
  const weightDiff = target - current;
  const daysToTarget = Math.abs(weightDiff / perDay);

  // Add final point at exactly the target weight
  arr.push({
    label: `יעד`,
    weight: target,
    days: Math.round(daysToTarget),
  });

  return arr;
}

function getDataFromLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    const current = localStorage.getItem("onb.currentWeightKg");
    const target = localStorage.getItem("onb.targetWeightKg");
    const pace = localStorage.getItem("onb.paceKgPerWeek");
    return {
      currentWeightKg: current ? parseFloat(current) : null,
      targetWeightKg: target ? parseFloat(target) : null,
      paceKgPerWeek: pace ? parseFloat(pace) : null,
    };
  } catch {
    return { currentWeightKg: null, targetWeightKg: null, paceKgPerWeek: null };
  }
}

function getDataFromURL() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const target = params.get("target_weight_kg");
    const current = params.get("current_weight_kg");
    const pace = params.get("pace_kg_per_week");

    const targetNum = target ? Number(target) : NaN;
    const currentNum = current ? Number(current) : NaN;
    const paceNum = pace ? Number(pace) : NaN;

    return {
      targetWeightKg: Number.isFinite(targetNum) && targetNum >= 20 && targetNum <= 500 ? Math.round(targetNum) : null,
      currentWeightKg: Number.isFinite(currentNum) && currentNum >= 20 && currentNum <= 500 ? Math.round(currentNum) : null,
      paceKgPerWeek: Number.isFinite(paceNum) && paceNum >= -2 && paceNum <= 2 ? paceNum : null,
    };
  } catch {
    return { currentWeightKg: null, targetWeightKg: null, paceKgPerWeek: null };
  }
}

export default function ReadinessPage() {
  const router = useRouter();

  // Target weight with proper fallback chain
  const [targetKg, setTargetKg] = useState<number | null>(null);
  const [currentKg, setCurrentKg] = useState<number>(75); // Default current weight
  const [paceKg, setPaceKg] = useState<number>(-0.4); // Default pace
  const [realDeadline, setRealDeadline] = useState<string | null>(null);
  const [targetSource, setTargetSource] = useState<string>("none");

  // Fetch target weight with fallback chain
  useEffect(() => {
    async function resolveTargetWeight() {
      let resolved: number | null = null;
      let source = "none";

      // 1) Try Supabase user metadata first
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const meta = user?.user_metadata as any;
        if (typeof meta?.target_weight_kg === "number" && meta.target_weight_kg >= 20 && meta.target_weight_kg <= 500) {
          resolved = Math.round(meta.target_weight_kg);
          source = "supabase";
          console.info("[OnboardingFinal] target weight source", { source, value: resolved });
        }
      } catch (err) {
        console.warn("[Readiness] Failed to fetch Supabase user metadata:", err);
      }

      // 2) Try API if not resolved
      if (resolved == null) {
        try {
          const res = await fetch("/api/onboarding/results-meta");
          const json = await res.json();
          if (json.ok && json.data?.targetKg) {
            const apiTarget = Number(json.data.targetKg);
            if (Number.isFinite(apiTarget) && apiTarget >= 20 && apiTarget <= 500) {
              resolved = Math.round(apiTarget);
              source = "api";
              setRealDeadline(json.data.deadline);
            }
          }
        } catch (err) {
          console.warn("[Readiness] Failed to fetch API meta:", err);
        }
      }

      // 3) Try localStorage if still not resolved
      if (resolved == null) {
        const localData = getDataFromLocalStorage();
        if (localData?.targetWeightKg != null && localData.targetWeightKg >= 20 && localData.targetWeightKg <= 500) {
          resolved = Math.round(localData.targetWeightKg);
          source = "localStorage";
        }
        // Also get current and pace from localStorage
        if (localData?.currentWeightKg) setCurrentKg(localData.currentWeightKg);
        if (localData?.paceKgPerWeek) setPaceKg(localData.paceKgPerWeek);
      }

      // 4) Try URL params as last resort
      if (resolved == null) {
        const urlData = getDataFromURL();
        if (urlData?.targetWeightKg != null) {
          resolved = urlData.targetWeightKg;
          source = "url";
        }
        if (urlData?.currentWeightKg) setCurrentKg(urlData.currentWeightKg);
        if (urlData?.paceKgPerWeek) setPaceKg(urlData.paceKgPerWeek);
      }

      console.info("[OnboardingFinal] target weight source", { source, value: resolved });
      setTargetKg(resolved);
      setTargetSource(source);
    }

    resolveTargetWeight();
  }, []);

  // Log display mode
  useEffect(() => {
    console.info('[OnboardingFinal] Display mode: maximum progress label instead of target weight');
  }, []);

  // Use resolved target; fallback to reasonable default only for graph calculations
  // The text display will show "התקדמות מירבית" instead of weight
  const displayTargetKg = targetKg ?? (currentKg - 3); // Graph fallback: slightly below current
  const displayTargetText = targetKg != null ? `${targetKg} ק״ג` : "—";
  const displayTargetAriaLabel = targetKg != null ? undefined : "משקל יעד לא זמין";

  // Build projection using the display target (which includes real target from DB if available)
  const projection = useMemo(
    () => buildProjection(currentKg, displayTargetKg, paceKg),
    [currentKg, displayTargetKg, paceKg]
  );

  // Calculate fallback deadline from current data (always computed)
  const fallbackDeadline = useMemo(() => {
    const diff = displayTargetKg - currentKg;
    const weeks = diff / paceKg;
    const days = Math.round(Math.abs(weeks * 7));
    const clampedDays = Math.min(days, 120);
    const date = new Date();
    date.setDate(date.getDate() + clampedDays);
    return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  }, [currentKg, displayTargetKg, paceKg]);

  // Use real deadline if available, otherwise use calculated fallback
  const displayDeadline = realDeadline ?? fallbackDeadline;

  // SVG chart dimensions
  const chartWidth = 320;
  const chartHeight = 220;
  const padding = { top: 30, right: 10, bottom: 40, left: 10 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Find min/max for y-scale
  const allWeights = [currentKg, ...projection.map((p) => p.weight)];
  const minWeight = Math.min(...allWeights) - 2;
  const maxWeight = Math.max(...allWeights) + 2;
  const weightRange = maxWeight - minWeight;

  // Map points to SVG coordinates - extend graph more to the right
  const svgPoints = [
    { x: padding.left, y: padding.top + plotHeight - ((currentKg - minWeight) / weightRange) * plotHeight },
    ...projection.map((p, i) => ({
      x: padding.left + ((i + 1) / (projection.length + 0.3)) * plotWidth,
      y: padding.top + plotHeight - ((p.weight - minWeight) / weightRange) * plotHeight,
    })),
  ];

  // Create path for line
  const linePath = svgPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Create path for area (add bottom corners)
  const areaPath = [
    `M ${svgPoints[0].x} ${padding.top + plotHeight}`,
    ...svgPoints.map((p) => `L ${p.x} ${p.y}`),
    `L ${svgPoints[svgPoints.length - 1].x} ${padding.top + plotHeight}`,
    "Z",
  ].join(" ");

  const handleContinue = async () => {
    // Check if notifications are already granted
    const permissionStatus = await getPushStatus();

    if (permissionStatus === 'granted') {
      // Already granted - skip rating and reminders pages and go straight to generating
      console.log('[ReadinessPage] Notifications already granted, skipping rating and reminders pages');
      saveOnboardingData({ notifications_opt_in: true });
      router.push("/onboarding/generating");
    } else {
      // Not granted - show rating page first, then reminders
      router.push("/onboarding/rating");
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5">
        {/* Title Block with progress hairline */}
        <div className="text-center mb-8 pt-20 sm:pt-24 flex-shrink-0 space-y-3">
          <div className="h-px w-14 bg-white/10 rounded-full mx-auto" />
          <OnboardingHeader
            title={
              <>
                הנתונים שלך מראים
                <br />
                שהמטרה בהישג יד!
              </>
            }
            subtitle="בואו נראה את התחזית שלך"
          />
        </div>

        {/* Projection Card - Single premium container */}
        <div
          className="relative rounded-2xl p-4 md:p-5 mb-8 shadow-[0_10px_35px_rgba(0,0,0,0.55)] overflow-hidden ring-1 ring-white/10"
          style={{
            paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 1.5rem)',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 35px rgba(0,0,0,0.55)'
          }}
        >
        {/* Card caption */}
        <p className="text-sm text-white/50 mb-4 text-right">עם FitJourney</p>

        {/* Chart - LTR flow with Hebrew labels */}
        <div className="mb-6" dir="ltr" aria-label="גרף תחזית המשקל">
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="overflow-visible"
          >
            {/* Defs - gradients and filters */}
            <defs>
              {/* Area gradient with lime accent */}
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E2F163" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#E2F163" stopOpacity="0.04" />
              </linearGradient>

              {/* Soft glow filter */}
              <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="glow"/>
                <feMerge>
                  <feMergeNode in="glow"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Vertical grid lines - softer */}
            {projection.map((_, i) => {
              const x = padding.left + ((i + 1) / (projection.length + 1)) * plotWidth;
              return (
                <line
                  key={`grid-${i}`}
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGradient)" />

            {/* Main line path with glow */}
            <path
              d={linePath}
              fill="none"
              stroke="#E2F163"
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="url(#softGlow)"
            >
              <animate
                attributeName="stroke-dasharray"
                from={`0 ${chartWidth * 2}`}
                to={`${chartWidth * 2} 0`}
                dur="1.4s"
                fill="freeze"
              />
            </path>

            {/* Data points */}
            {svgPoints.map((p, i) => {
              const isLast = i === svgPoints.length - 1;
              if (isLast) {
                // Target marker with ping animation
                return (
                  <g key={`point-${i}`}>
                    {/* Ping circle animation */}
                    <circle cx={p.x} cy={p.y} r="8" fill="transparent" stroke="#E2F163" strokeWidth="2" opacity="0.4">
                      <animate
                        attributeName="r"
                        values="8;14;8"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.4;0;0.4"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                    {/* Inner glow */}
                    <circle cx={p.x} cy={p.y} r="16" fill="rgba(226, 241, 99, 0.15)" />
                    <circle cx={p.x} cy={p.y} r="12" fill="#E2F163" />
                    {/* Trophy icon */}
                    <svg x={p.x - 6} y={p.y - 6} width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 9H4.5C3.67 9 3 8.33 3 7.5V6C3 5.45 3.45 5 4 5H6M18 9h1.5c.83 0 1.5-.67 1.5-1.5V6c0-.55-.45-1-1-1h-2"
                        stroke="#0e0f12"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 5h8v5.5c0 2.5-1.79 4.5-4 4.5s-4-2-4-4.5V5z"
                        fill="#0e0f12"
                        stroke="#0e0f12"
                        strokeWidth="1.5"
                      />
                      <path d="M10 19h4M12 15v4" stroke="#0e0f12" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </g>
                );
              } else if (i === 0) {
                // Starting point
                return (
                  <circle key={`point-${i}`} cx={p.x} cy={p.y} r="5" fill="#0B0D0E" stroke="#E2F163" strokeWidth="3" filter="url(#softGlow)" />
                );
              } else {
                // Intermediate points
                return (
                  <circle key={`point-${i}`} cx={p.x} cy={p.y} r="4" fill="#E2F163" opacity="0.4" />
                );
              }
            })}

            {/* X-axis labels */}
            <text x={svgPoints[0].x} y={chartHeight - 10} fill="#ffffff" opacity="0.5" fontSize="11" textAnchor="middle">
              היום
            </text>
            {projection.map((p, i) => {
              const x = svgPoints[i + 1].x;
              return (
                <text key={`label-${i}`} x={x} y={chartHeight - 10} fill="#ffffff" opacity="0.5" fontSize="11" textAnchor="middle">
                  {p.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Explanation text with enhanced highlighting */}
        <div className="text-right text-[15px] text-white/80 leading-relaxed" dir="rtl">
          <p>
            לפי הנתונים שלנו, שינוי משמעותי בדרך כלל נראה לאחר שבוע.
            <br />
            בקצב הנוכחי תוכל להגיע ל{" "}
            <span className="text-[#E2F163] font-semibold">
              התקדמות מירבית
            </span>
            {" "}עד{" "}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E2F163]/15 text-[#E2F163] px-2 py-0.5 font-semibold">
              {displayDeadline}
            </span>.
          </p>
        </div>
      </div>
      </div>

      {/* CTA Button - Fixed at bottom of viewport with spacing */}
      <footer
        className="flex-shrink-0 z-40 bg-[#0D0E0F] px-5 pt-3 pb-3 border-t border-white/5"
        style={{
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
        }}
      >
        <button
          onClick={handleContinue}
          className="w-full h-14 bg-[#E2F163] text-[#0B0D0E] font-bold text-lg rounded-full transition-transform hover:bg-[#d4e350] active:scale-[0.99]"
        >
          הבא
        </button>
      </footer>
    </div>
  );
}
