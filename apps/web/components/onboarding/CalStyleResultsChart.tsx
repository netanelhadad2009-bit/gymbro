"use client";
import React from "react";

const FITJOURNEY_LINE = "#E2F163";
const TRAD_LINE = "#D06A6A";
const GRID_COLOR = "rgba(255,255,255,0.08)";
const TEXT_COLOR = "rgba(255,255,255,0.92)";

type Props = {
  rtl?: boolean;
  className?: string;
};

export default function CalStyleResultsChart({
  rtl = true,
  className = "",
}: Props) {
  const w = 360,
    h = 210,
    padX = 26,
    padY = 18;

  // Right-to-left axis: x=padX (RIGHT), x=w-padX (LEFT)
  const xR = (t: number) => padX + (1 - t) * (w - padX * 2); // t: 0..1, 0=Month1 (right), 1=Month6 (left)
  const y = (v: number) => padY + v * (h - padY * 2); // v: 0..1

  // Smooth curves (0..1 time)
  // FitJourney: steady decrease with slight shoulder around mid
  const gym = `M ${xR(0)},${y(0.32)}
               C ${xR(0.25)},${y(0.34)} ${xR(0.45)},${y(0.42)} ${xR(0.55)},${y(0.52)}
               S ${xR(0.85)},${y(0.76)} ${xR(1)},${y(0.88)}`;

  // Traditional: slight up then down (worse over time)
  const trad = `M ${xR(0)},${y(0.34)}
                C ${xR(0.25)},${y(0.3)} ${xR(0.45)},${y(0.28)} ${xR(0.6)},${y(0.36)}
                S ${xR(0.9)},${y(0.58)} ${xR(1)},${y(0.64)}`;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className={className}>
      <div
        className="text-[15px] font-semibold mb-2"
        style={{ color: TEXT_COLOR }}
      >
        המשקל שלך
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="fjArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FITJOURNEY_LINE} stopOpacity="0.16" />
            <stop offset="100%" stopColor={FITJOURNEY_LINE} stopOpacity="0" />
          </linearGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="2.2"
              floodColor="#000"
              floodOpacity="0.35"
            />
          </filter>
        </defs>

        {/* Grid */}
        <g stroke={GRID_COLOR}>
          {[0, 1, 2, 3].map((i) => {
            const yy = padY + (i * (h - padY * 2)) / 4;
            return <line key={i} x1={padX} y1={yy} x2={w - padX} y2={yy} />;
          })}
        </g>

        {/* Area under FitJourney */}
        <path
          d={`${gym} L ${xR(1)},${y(0.95)} L ${xR(0)},${y(0.95)} Z`}
          fill="url(#fjArea)"
        />

        {/* Lines */}
        <path
          d={trad}
          fill="none"
          stroke={TRAD_LINE}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#softGlow)"
        />
        <path
          d={gym}
          fill="none"
          stroke={FITJOURNEY_LINE}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#softGlow)"
        />

        {/* Endpoints */}
        <circle
          cx={xR(0)}
          cy={y(0.32)}
          r="6.5"
          fill="#fff"
          stroke={FITJOURNEY_LINE}
          strokeWidth="2"
        />
        <circle
          cx={xR(1)}
          cy={y(0.88)}
          r="6.5"
          fill="#fff"
          stroke={FITJOURNEY_LINE}
          strokeWidth="2"
        />

        {/* Traditional label near red curve (right aligned) */}
        <text
          x={xR(0.4)}
          y={y(0.3)}
          fontSize="13"
          fill="#C77C7C"
          textAnchor="end"
        >
          דיאטה מסורתית
        </text>

        {/* X-axis labels (RTL: Month1 on the right, Month6 on the left) */}
        <text x={xR(0)} y={h - 4} fontSize="12" fill={TEXT_COLOR} opacity="0.7">
          חודש 1
        </text>
        <text
          x={xR(1)}
          y={h - 4}
          fontSize="12"
          fill={TEXT_COLOR}
          opacity="0.7"
          textAnchor="end"
        >
          חודש 6
        </text>

        {/* FitJourney chip (bottom-right) */}
        <g transform={`translate(${xR(0) - 70}, ${h - 28})`}>
          <rect
            width="74"
            height="22"
            rx="10"
            fill="#1B1B1B"
            stroke="rgba(255,255,255,0.08)"
          />
          <text x="37" y="15" fill="#fff" fontSize="12" textAnchor="middle">
            FitJourney
          </text>
        </g>
      </svg>
    </div>
  );
}
