/**
 * FlameSVG - Clean, pointed flame with no morphing
 *
 * Features:
 * - Sharp pointed tip with asymmetric S-curve
 * - 4 layered flame tongues (outer, mid, inner, core)
 * - Only transform/opacity animations (no path morphing)
 * - No distortion, no clipping, no pedestal
 * - Self-contained CSS
 */

import React from "react";

const C_OUTER = "#D9F86E";
const C_MID = "#C7F05A";
const C_INNER = "#B7E54B";
const C_CORE = "#FFFFFF";

export default function FlameSVG({
  width = 240,
  className,
}: {
  width?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        width,
        height: "auto",
        display: "inline-block",
        overflow: "visible",
        aspectRatio: "200 / 300",
        transform: "none",
      }}
    >
      <svg
        viewBox="0 0 200 300"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMax meet"
        style={{ overflow: "visible" }}
      >
        <defs>
          <radialGradient id="gGlow" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#E2F163" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#E2F163" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#E2F163" stopOpacity="0" />
          </radialGradient>
          <style>{`
            .fl-out { transform-origin: 50% 88%; transform-box: fill-box; animation: sway 3.2s ease-in-out infinite; }
            .fl-mid { transform-origin: 50% 88%; transform-box: fill-box; animation: breathe 3.6s ease-in-out infinite; }
            .fl-in  { transform-origin: 50% 88%; transform-box: fill-box; animation: flicker 520ms steps(2,end) infinite; }
            .fl-core{ transform-origin: 50% 88%; transform-box: fill-box; animation: flicker 460ms steps(2,end) infinite; }
            @keyframes sway { 0%{transform:rotate(-1deg)} 50%{transform:rotate(1deg)} 100%{transform:rotate(-1deg)} }
            @keyframes breathe { 0%{transform:scale(0.995)} 50%{transform:scale(1.005)} 100%{transform:scale(0.995)} }
            @keyframes flicker { 0%{opacity:.88; transform:translateY(0)} 50%{opacity:1; transform:translateY(-0.6px)} 100%{opacity:.92; transform:translateY(0)} }
            @media (prefers-reduced-motion: reduce){
              .fl-out,.fl-mid,.fl-in,.fl-core { animation: none !important; }
            }
          `}</style>
        </defs>

        {/* Glow (outside geometry) */}
        <circle cx="100" cy="165" r="90" fill="url(#gGlow)" />

        {/* ===== GEOMETRY: pointed flame, no morphing ===== */}
        <g id="flame">
          {/* OUTER pointed silhouette */}
          <path
            className="fl-out"
            fill={C_OUTER}
            d="
            M100 10
            C 92 26, 84 52, 86 74
            C 88 98, 104 120, 117 144
            C 133 176, 140 206, 134 232
            C 126 268, 100 288, 66 292
            C 38 296, 12 286, 4 268
            C -2 254, 4 238, 14 222
            C 30 196, 54 170, 70 148
            C 88 122, 98 98, 98 76
            C 98 48, 94 28, 100 10
            C 110 20, 118 46, 118 74
            C 118 98, 112 118, 106 134
            C 96 160, 78 184, 60 210
            C 44 232, 36 248, 38 262
            C 40 274, 50 282, 68 284
            C 100 288, 130 270, 140 236
            C 148 210, 140 176, 124 146
            C 110 120, 94 98, 92 74
            C 90 52, 94 26, 100 10 Z
          "
          />

          {/* MID tongue */}
          <path
            className="fl-mid"
            fill={C_MID}
            d="
            M102 36
            C 96 52, 94 76, 96 94
            C 98 112, 110 132, 120 150
            C 130 168, 134 186, 130 204
            C 124 232, 102 248, 74 252
            C 54 254, 40 248, 32 238
            C 26 230, 26 220, 30 210
            C 38 192, 56 172, 74 150
            C 90 130, 102 112, 104 94
            C 106 76, 106 54, 102 36 Z
          "
          />

          {/* INNER tongue */}
          <path
            className="fl-in"
            fill={C_INNER}
            d="
            M102 70
            C 98 86, 98 102, 100 114
            C 104 128, 112 142, 118 154
            C 122 164, 124 174, 120 186
            C 114 200, 100 208, 82 210
            C 68 212, 58 208, 52 200
            C 46 192, 46 182, 50 172
            C 56 160, 66 148, 78 132
            C 90 118, 98 102, 102 86
            C 104 80, 104 74, 102 70 Z
          "
          />

          {/* CORE (white drop) */}
          <path
            className="fl-core"
            fill={C_CORE}
            d="
            M96 100
            C 98 110, 98 122, 96 130
            C 94 140, 102 152, 110 162
            C 116 170, 116 178, 110 186
            C 102 196, 86 202, 72 198
            C 60 196, 52 188, 50 178
            C 48 170, 50 162, 54 154
            C 60 144, 70 134, 80 122
            C 88 114, 94 106, 96 100 Z
          "
          />
        </g>

        {/* Ground shadow (subtle, not a stand) */}
        <ellipse cx="100" cy="282" rx="42" ry="10" fill="#000" opacity="0.18" />
      </svg>
    </div>
  );
}
