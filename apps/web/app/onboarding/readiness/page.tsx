"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { getOnboardingData } from "@/lib/onboarding-storage";
import OnboardingHeader from "../components/OnboardingHeader";

type Point = { label: string; weight: number; days: number };

function buildProjection(
  current: number,
  target: number,
  pacePerWeek: number
): Point[] {
  const days = [3, 7, 30, 60, 90];
  const perDay = pacePerWeek / 7; // kg per day (+/-)
  const arr = days.map((d) => ({
    label: d === 3 ? "3 ימים" : d === 7 ? "7 ימים" : `${d} ימים`,
    weight: Number((current + perDay * d).toFixed(1)),
    days: d,
  }));
  // clamp end toward target (don't overshoot by > 0.5kg)
  const last = arr[arr.length - 1];
  if (pacePerWeek < 0 && last.weight < target - 0.5) last.weight = target;
  if (pacePerWeek > 0 && last.weight > target + 0.5) last.weight = target;
  return arr;
}

function getDataFromLocalStorage() {
  if (typeof window === "undefined") return null;
  try {
    const current = localStorage.getItem("onb.currentWeightKg");
    const target = localStorage.getItem("onb.targetWeightKg");
    const pace = localStorage.getItem("onb.paceKgPerWeek");
    return {
      currentWeightKg: current ? parseFloat(current) : 75,
      targetWeightKg: target ? parseFloat(target) : 72,
      paceKgPerWeek: pace ? parseFloat(pace) : -0.4,
    };
  } catch {
    return { currentWeightKg: 75, targetWeightKg: 72, paceKgPerWeek: -0.4 };
  }
}

export default function ReadinessPage() {
  const router = useRouter();

  const { currentWeightKg, targetWeightKg, paceKgPerWeek } = useMemo(
    () => getDataFromLocalStorage() || { currentWeightKg: 75, targetWeightKg: 72, paceKgPerWeek: -0.4 },
    []
  );

  const projection = useMemo(
    () => buildProjection(currentWeightKg, targetWeightKg, paceKgPerWeek),
    [currentWeightKg, targetWeightKg, paceKgPerWeek]
  );

  // Calculate target date
  const targetDate = useMemo(() => {
    const diff = targetWeightKg - currentWeightKg;
    const weeks = diff / paceKgPerWeek;
    const days = Math.round(Math.abs(weeks * 7));
    const clampedDays = Math.min(days, 120);
    const date = new Date();
    date.setDate(date.getDate() + clampedDays);
    return date.toLocaleDateString("he-IL", { day: "numeric", month: "long" });
  }, [currentWeightKg, targetWeightKg, paceKgPerWeek]);

  // SVG chart dimensions
  const chartWidth = 320;
  const chartHeight = 220;
  const padding = { top: 30, right: 10, bottom: 40, left: 10 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Find min/max for y-scale
  const allWeights = [currentWeightKg, ...projection.map((p) => p.weight)];
  const minWeight = Math.min(...allWeights) - 2;
  const maxWeight = Math.max(...allWeights) + 2;
  const weightRange = maxWeight - minWeight;

  // Map points to SVG coordinates
  const svgPoints = [
    { x: padding.left, y: padding.top + plotHeight - ((currentWeightKg - minWeight) / weightRange) * plotHeight },
    ...projection.map((p, i) => ({
      x: padding.left + ((i + 1) / (projection.length + 1)) * plotWidth,
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

  const handleContinue = () => {
    router.push("/onboarding/reminders");
  };

  return (
    <div className="flex flex-col min-h-full px-5 relative">
      {/* Title Block */}
      <div className="text-center mb-8 mt-4 flex-shrink-0">
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

      {/* Projection Card */}
      <div className="rounded-3xl bg-[#14161b] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] mb-8" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
        {/* Card caption */}
        <p className="text-sm text-white/50 mb-4 text-right">עם GymBro</p>

        {/* Chart */}
        <div className="mb-6">
          <svg
            width="100%"
            height={chartHeight}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="overflow-visible"
          >
            {/* Vertical grid lines */}
            {projection.map((_, i) => {
              const x = padding.left + ((i + 1) / (projection.length + 1)) * plotWidth;
              return (
                <line
                  key={`grid-${i}`}
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={padding.top + plotHeight}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Area gradient */}
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGradient)" />

            {/* Line path - first segment in gray, rest in lime */}
            <path
              d={linePath}
              fill="none"
              stroke="#A1A1AA"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {/* Highlight last segment */}
            {svgPoints.length > 1 && (
              <path
                d={`M ${svgPoints[svgPoints.length - 2].x} ${svgPoints[svgPoints.length - 2].y} L ${
                  svgPoints[svgPoints.length - 1].x
                } ${svgPoints[svgPoints.length - 1].y}`}
                fill="none"
                stroke="#E2F163"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}

            {/* Data points */}
            {svgPoints.map((p, i) => {
              const isLast = i === svgPoints.length - 1;
              if (isLast) {
                // Trophy marker for last point
                return (
                  <g key={`point-${i}`}>
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
                  <circle key={`point-${i}`} cx={p.x} cy={p.y} r="5" fill="#A1A1AA" opacity="0.8" />
                );
              } else {
                // Intermediate points
                return (
                  <circle key={`point-${i}`} cx={p.x} cy={p.y} r="4" fill="#A1A1AA" opacity="0.6" />
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

        {/* Explanation text */}
        <div className="text-right text-sm text-white/60 leading-relaxed">
          <p>
            לפי הנתונים שלנו, בדרך כלל רואים שינוי משמעותי אחרי שבוע.
            <br />
            בקצב שבחרת נוכל להגיע ל־
            <span className="text-[#E2F163] font-semibold">{targetWeightKg} ק״ג</span> עד {targetDate}.
          </p>
        </div>
      </div>

      {/* CTA Button - Fixed at bottom of viewport with spacing */}
      <footer
        className="fixed left-0 right-0 z-40 bg-[#0D0E0F] px-5 pt-3 border-t border-white/5"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
          paddingBottom: '0.75rem'
        }}
      >
        <button
          onClick={handleContinue}
          className="w-full h-14 bg-[#E2F163] text-black font-bold text-lg rounded-full transition hover:bg-[#d4e350] active:scale-[0.98]"
        >
          הבא
        </button>
      </footer>
    </div>
  );
}
