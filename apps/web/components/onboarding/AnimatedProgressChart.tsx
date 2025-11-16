"use client";
import React from "react";
import { motion } from "framer-motion";

type Props = {
  rtl?: boolean;
  accentColor?: string;
  className?: string;
};

export default function AnimatedProgressChart({
  rtl = true,
  accentColor = "#E2F163",
  className = "",
}: Props) {
  const w = 360;
  const h = 200;
  const padX = 30;
  const padY = 20;

  // Data points for smooth curves (LTR: left to right progression)
  const dataPoints = [
    { x: padX, y: h - padY - 40, label: "חודש 1" }, // Left (start)
    { x: w / 2, y: h - padY - 80, label: "חודש 3" }, // Middle
    { x: w - padX, y: h - padY - 130, label: "חודש 6" }, // Right (end)
  ];

  const dataPointsWithout = [
    { x: padX, y: h - padY - 35 },
    { x: w / 2, y: h - padY - 45 },
    { x: w - padX, y: h - padY - 30 },
  ];

  // Create smooth path using cubic bezier
  const createSmoothPath = (points: Array<{ x: number; y: number; label?: string }>) => {
    if (points.length < 2) return "";

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlPointX = (current.x + next.x) / 2;

      path += ` C ${controlPointX},${current.y} ${controlPointX},${next.y} ${next.x},${next.y}`;
    }

    return path;
  };

  const fitjourneyPath = createSmoothPath(dataPoints);
  const withoutPath = createSmoothPath(dataPointsWithout);

  // Area path for gradient fill (LTR: ends on right, so close from right to left)
  const areaPath = `${fitjourneyPath} L ${w - padX},${h - padY} L ${padX},${h - padY} Z`;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className={className}>
      {/* Header row */}
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <h3 className="text-[15px] sm:text-[16px] font-semibold text-white">
          ההתקדמות שלך לאורך זמן
        </h3>
        <span className="text-[11px] text-white/60">FitJourney</span>
      </div>

      {/* Chart area - LTR for left-to-right progression */}
      <div dir="ltr">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          {/* Gradient fill under FitJourney line */}
          <linearGradient id="fitjourneyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accentColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
          </linearGradient>

          {/* Glow filter for lines */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Stronger glow for dots */}
          <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        <g opacity="0.06" stroke="#fff">
          {[0, 1, 2, 3].map((i) => {
            const y = padY + (i * (h - padY * 2)) / 3;
            return <line key={i} x1={padX} y1={y} x2={w - padX} y2={y} />;
          })}
        </g>

        {/* Area fill under FitJourney line - appears first */}
        <motion.path
          d={areaPath}
          fill="url(#fitjourneyGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        />

        {/* Without FitJourney line (gray) - no animation */}
        <path
          d={withoutPath}
          fill="none"
          stroke="#5B5B5B"
          strokeWidth="3"
          opacity="0.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* FitJourney line (lime) - animated draw */}
        <motion.path
          d={fitjourneyPath}
          fill="none"
          stroke={accentColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.8, ease: "easeInOut", delay: 0.2 }}
        />

        {/* Animated dots at data points */}
        {dataPoints.map((point, i) => (
          <motion.g key={i}>
            {/* Outer glow circle */}
            <motion.circle
              cx={point.x}
              cy={point.y}
              r="8"
              fill={accentColor}
              opacity="0.2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.2 }}
              transition={{ duration: 0.4, delay: 1.2 + i * 0.2 }}
            />
            {/* Main dot */}
            <motion.circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill={accentColor}
              filter="url(#dotGlow)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 1.2 + i * 0.2 }}
            />
            {/* Pulsating effect on last point */}
            {i === dataPoints.length - 1 && (
              <motion.circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="none"
                stroke={accentColor}
                strokeWidth="2"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  ease: "easeOut",
                }}
              />
            )}
          </motion.g>
        ))}

        {/* X-axis labels */}
        {dataPoints.map((point, i) => (
          <motion.text
            key={i}
            x={point.x}
            y={h - 8}
            fontSize="12"
            fill="#fff"
            opacity="0.7"
            textAnchor="middle"
            initial={{ opacity: 0, y: h }}
            animate={{ opacity: 0.7, y: h - 8 }}
            transition={{ duration: 0.5, delay: 1.4 + i * 0.15 }}
          >
            {point.label}
          </motion.text>
        ))}

        {/* "Without FitJourney" label */}
        <motion.text
          x={dataPointsWithout[1].x}
          y={dataPointsWithout[1].y - 12}
          fontSize="11"
          fill="#8B8B8B"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.5, delay: 1.0 }}
        >
          ללא FitJourney
        </motion.text>
      </svg>
      </div>

      {/* Legend (right-aligned) */}
      <motion.div
        className="mt-3 flex justify-end gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.8 }}
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-[11px] text-white/80">
          <span
            className="block h-2 w-2 rounded-full"
            style={{
              background: accentColor,
              boxShadow: `0 0 10px ${accentColor}`,
            }}
          />
          FitJourney
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] text-white/60">
          <span className="block h-2 w-2 rounded-full bg-white/35" />
          ללא FitJourney
        </span>
      </motion.div>
    </div>
  );
}
