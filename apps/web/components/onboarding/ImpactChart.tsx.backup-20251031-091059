"use client";
import React from "react";
import { motion } from "framer-motion";

type Point = { x: number; y: number };
type Series = { id: string; color: string; points: Point[]; fill?: string };

function toPath(points: Point[]) {
  return points.map((p, i) => `${i ? "L" : "M"} ${p.x},${p.y}`).join(" ");
}

export default function ImpactChart() {
  // 320x160 logical canvas
  const w = 320,
    h = 160,
    pad = 16;
  // Simple 2-point comparison (month 1 → month 6)
  const our: Point[] = [
    { x: pad, y: h - 60 },
    { x: w - pad, y: h - 90 },
  ];
  const generic: Point[] = [
    { x: pad, y: h - 50 },
    { x: w - pad, y: h - 30 },
  ];

  const series: Series[] = [
    { id: "our", color: "#E2F163", points: our, fill: "url(#gradOur)" },
    {
      id: "gen",
      color: "rgba(255,255,255,0.35)",
      points: generic,
      fill: "url(#gradGen)",
    },
  ];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="gradOur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E2F163" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#E2F163" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="gradGen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* grid */}
        <g opacity="0.12" stroke="white">
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              x1={pad}
              x2={w - pad}
              y1={pad + i * ((h - 2 * pad) / 4)}
              y2={pad + i * ((h - 2 * pad) / 4)}
            />
          ))}
        </g>

        {series.map((s) => {
          const area = `${toPath(s.points)} L ${w - pad},${h - pad} L ${pad},${h - pad} Z`;
          return (
            <g key={s.id}>
              <path d={area} fill={s.fill ?? "transparent"} />
              <motion.path
                d={toPath(s.points)}
                fill="none"
                stroke={s.color}
                strokeWidth={3}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1.2,
                  ease: "easeOut",
                  delay: s.id === "our" ? 0.1 : 0.25,
                }}
              />
              {s.points.map((p, i) => (
                <motion.circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={5}
                  fill={s.color}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                />
              ))}
            </g>
          );
        })}

        {/* axes labels (RTL Hebrew) */}
        <text
          x={pad}
          y={h - 6}
          fill="#9AA1A9"
          fontSize="11"
          textAnchor="start"
        >
          חודש 1
        </text>
        <text
          x={w - pad}
          y={h - 6}
          fill="#9AA1A9"
          fontSize="11"
          textAnchor="end"
        >
          6 חודשים
        </text>
      </svg>
    </div>
  );
}
