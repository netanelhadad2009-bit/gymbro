/**
 * Full Flame Component - No Clipping
 *
 * Features:
 * - Auto-measures only flame geometry (not glow/shadow)
 * - Natural full flame shape (not leaf-like)
 * - CSS animations for smooth performance
 * - Proper anchoring with preserveAspectRatio
 * - No distortion, no pedestal artifacts
 */

"use client";

import * as React from "react";

type FlameProps = {
  size?: number;
  pad?: number;
  className?: string;
};

// Color palette - FitJourney greens
const C_OUTER = "#D9F86E";
const C_MID = "#C7F05A";
const C_INNER = "#B7E54B";
const C_CORE = "#FFFFFF";
const C_GLOW = "#E2F163";

export default function Flame({ size = 300, pad = 30, className = "" }: FlameProps) {
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const [vb, setVb] = React.useState<readonly [number, number, number, number]>([0, 0, 600, 600]);
  const [reduce, setReduce] = React.useState(false);

  // Check reduced motion preference
  React.useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduce(mediaQuery.matches);
    }
  }, []);

  // Measure flame geometry only (not glow/shadow)
  React.useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const timer = setTimeout(() => {
      const g = svg.querySelector("#flameGeom");
      if (!g) {
        console.warn("[Flame] No #flameGeom found for measurement");
        return;
      }

      try {
        const bbox = (g as SVGGElement).getBBox();
        console.log("[Flame] Measured bbox:", bbox);

        const view = [
          Math.floor(bbox.x - pad),
          Math.floor(bbox.y - pad),
          Math.ceil(bbox.width + pad * 2),
          Math.ceil(bbox.height + pad * 2),
        ] as const;

        console.log("[Flame] Setting viewBox:", view);
        setVb(view);
      } catch (e) {
        console.warn("[Flame] Could not measure bbox:", e);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pad]);

  const animClass = reduce ? "no-anim" : "";

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        overflow: "visible",
        margin: "0 auto",
        isolation: "isolate",
        WebkitMaskImage: "none",
        maskImage: "none",
        clipPath: "none"
      }}
      aria-label="Streak flame"
      role="img"
    >
      <svg
        ref={svgRef}
        viewBox={vb.join(" ")}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMax meet"
        style={{ display: "block", overflow: "visible" }}
      >
        <defs>
          {/* Glow gradient */}
          <radialGradient id="gGlow" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor={C_GLOW} stopOpacity="0.30" />
            <stop offset="60%" stopColor={C_GLOW} stopOpacity="0.14" />
            <stop offset="100%" stopColor={C_GLOW} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Flame geometry group - ONLY paths measured for viewBox */}
        <g id="flameGeom" data-flame-geom="">
          {/* OUTER flame - organic flickering edges like real fire */}
          <path
            className={`flame-outer ${animClass}`}
            d="M150 15
               C148 18 146 22 145 28
               C143 38 142 48 144 58
               L147 68
               C148 75 148 82 147 88
               L145 98
               C144 108 145 118 148 127
               C152 142 160 155 168 168
               L175 180
               C180 190 184 201 186 212
               C188 225 188 238 185 251
               C182 265 176 278 167 289
               C158 300 146 308 133 313
               C120 318 106 319 93 317
               C80 315 68 309 58 300
               C48 291 41 279 37 266
               C33 253 32 239 34 225
               C36 211 41 198 49 186
               L58 173
               C64 163 68 152 70 141
               L72 128
               C73 118 72 108 69 98
               L66 85
               C64 76 63 67 64 58
               C65 48 68 39 73 31
               C78 23 85 17 93 13
               C101 9 110 7 119 8
               C128 9 136 12 143 17
               Z"
            fill={C_OUTER}
          />

          {/* MID flame - smaller internal flame shape */}
          <path
            className={`flame-mid ${animClass}`}
            d="M135 45
               C133 50 132 56 133 62
               C134 70 137 78 141 85
               C147 95 155 104 163 112
               C170 120 176 129 180 139
               C184 150 185 162 183 173
               C181 185 176 196 168 205
               C160 214 149 220 137 223
               C125 226 113 225 102 221
               C91 217 82 209 75 199
               C68 189 64 177 63 165
               C62 153 64 140 69 129
               C74 118 82 108 91 100
               C100 92 110 85 119 80
               C125 76 130 71 133 65
               Z"
            fill={C_MID}
          />

          {/* INNER flame - bright inner tongue */}
          <path
            className={`flame-inner ${animClass}`}
            d="M125 75
               C123 82 123 90 125 97
               C128 107 134 116 141 123
               C148 130 156 136 163 143
               C168 149 171 157 172 165
               C173 173 171 181 167 188
               C163 195 156 200 149 203
               C142 206 134 206 127 204
               C120 202 114 197 109 191
               C104 185 101 177 100 169
               C99 161 100 153 103 145
               C106 137 111 130 117 124
               C121 119 125 114 128 109
               Z"
            fill={C_INNER}
          />

          {/* CORE - white hot center */}
          <path
            className={`flame-core ${animClass}`}
            d="M135 105
               C133 110 132 116 133 122
               C135 130 139 137 144 143
               C149 149 155 154 160 160
               C164 165 166 172 166 179
               C166 186 163 192 159 197
               C155 202 149 205 143 206
               C137 207 131 206 126 203
               C121 200 117 195 114 189
               C111 183 110 177 111 170
               C112 163 115 157 119 151
               C123 145 128 140 133 136
               Z"
            fill={C_CORE}
          />
        </g>

        {/* Glow - outside measurement, static position */}
        <g className={`flame-glow ${animClass}`}>
          <circle cx="50%" cy="55%" r="42%" fill="url(#gGlow)" />
        </g>

        {/* Ground shadow - outside measurement */}
        <ellipse cx="50%" cy="92%" rx="22%" ry="7%" fill="#000" opacity="0.22" />
      </svg>
    </div>
  );
}
