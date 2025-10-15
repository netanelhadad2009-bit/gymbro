"use client";

import { useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useGesture } from "@use-gesture/react";
import { StageNode } from "./StageNode";
import type { Stage, UserStage } from "@/lib/stageEngine";
import type { PathNode } from "@/lib/path";
import { colors } from "@/lib/tokens";

interface JourneyCanvasProps {
  stages: Stage[];
  userStages: UserStage[];
  pathD: string;
  nodePositions: PathNode[];
  canvasWidth: number;
  canvasHeight: number;
  onNodeClick: (stage: Stage) => void;
}

export function JourneyCanvas({
  stages,
  userStages,
  pathD,
  nodePositions,
  canvasWidth,
  canvasHeight,
  onNodeClick,
}: JourneyCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for pan and zoom
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const scale = useMotionValue(1);

  // Gesture handlers
  useGesture(
    {
      onDrag: ({ offset: [ox, oy] }) => {
        x.set(ox);
        y.set(oy);
      },
      onPinch: ({ offset: [d] }) => {
        scale.set(1 + d / 200);
      },
      onWheel: ({ event, delta: [, dy] }) => {
        event.preventDefault();
        const newScale = Math.max(0.5, Math.min(2, scale.get() - dy * 0.001));
        scale.set(newScale);
      },
    },
    {
      target: containerRef,
      drag: {
        from: () => [x.get(), y.get()],
        bounds: {
          left: -200,
          right: 200,
          top: -200,
          bottom: canvasHeight - 400,
        },
      },
      pinch: {
        from: () => [scale.get() * 200, 0],
        scaleBounds: { min: 0.5, max: 2 },
      },
    }
  );

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg"
      style={{
        height: typeof window !== 'undefined' && window.innerWidth < 640 ? "70vh" : "80vh",
        maxHeight: canvasHeight,
        touchAction: "none",
        cursor: "grab",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <motion.div
        style={{
          x,
          y,
          scale,
          width: canvasWidth,
          height: canvasHeight,
        }}
        className="origin-center mx-auto"
      >
        <svg
          width={canvasWidth}
          height={canvasHeight}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="mx-auto rounded-xl"
          style={{
            background: "linear-gradient(135deg, #5a5a5a 0%, #4a4a4a 50%, #3a3a3a 100%)",
            boxShadow: "inset 0 0 50px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {/* Defs */}
          <defs>
            {/* Concrete texture pattern */}
            <filter id="concrete">
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise"/>
              <feDiffuseLighting in="noise" lightingColor="#999" surfaceScale="1">
                <feDistantLight azimuth="45" elevation="60"/>
              </feDiffuseLighting>
              <feComposite operator="in" in2="SourceAlpha"/>
              <feBlend mode="multiply" in2="SourceGraphic"/>
            </filter>

            {/* Green path gradient for completed sections */}
            <linearGradient id="greenPath" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#6fe3a1", stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: "#5acc89", stopOpacity: 0.6 }} />
            </linearGradient>

            {/* Red path gradient for locked sections */}
            <linearGradient id="redPath" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: "#d32f2f", stopOpacity: 0.8 }} />
              <stop offset="100%" style={{ stopColor: "#b71c1c", stopOpacity: 0.6 }} />
            </linearGradient>
          </defs>

          {/* Concrete texture overlay */}
          <rect
            width={canvasWidth}
            height={canvasHeight}
            fill="#5a5a5a"
            filter="url(#concrete)"
            opacity="0.4"
          />

          {/* Subtle vignette */}
          <rect
            width={canvasWidth}
            height={canvasHeight}
            fill="radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)"
            opacity="0.3"
          />

          {/* Dark background rectangle with subtle noise */}
          <rect
            width={canvasWidth}
            height={canvasHeight}
            fill="#4a4a4a"
            opacity="0.15"
          />

          {/* Animated dashed path - Green for completed */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#greenPath)"
            strokeWidth="8"
            strokeDasharray="15 15"
            strokeLinecap="round"
            animate={{
              strokeDashoffset: [-160, 0],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            opacity="0.9"
          />

          {/* Red dashed path for locked sections (upper part) */}
          <motion.path
            d={pathD}
            fill="none"
            stroke="url(#redPath)"
            strokeWidth="8"
            strokeDasharray="15 15"
            strokeLinecap="round"
            strokeDashoffset="700"
            animate={{
              strokeDashoffset: [540, 700],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "linear",
            }}
            opacity="0.9"
          />

          {/* Stage nodes */}
          {stages.map((stage, idx) => {
            const pos = nodePositions[idx];
            const userStage = userStages[idx];

            if (!pos || !userStage) return null;

            return (
              <StageNode
                key={stage.code}
                stage={stage}
                userStage={userStage}
                x={pos.x}
                y={pos.y}
                onClick={() => onNodeClick(stage)}
              />
            );
          })}
        </svg>
      </motion.div>

      {/* Zoom controls - Mobile optimized */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:left-6 flex flex-row sm:flex-col gap-2">
        <button
          onClick={() => scale.set(Math.min(2, scale.get() + 0.2))}
          className="flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-full sm:rounded-lg transition-all active:scale-95 shadow-lg"
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            border: "2px solid " + colors.accent
          }}
          aria-label="הגדל"
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="10" y1="5" x2="10" y2="15" />
            <line x1="5" y1="10" x2="15" y2="10" />
          </svg>
        </button>
        <button
          onClick={() => scale.set(Math.max(0.5, scale.get() - 0.2))}
          className="flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-full sm:rounded-lg transition-all active:scale-95 shadow-lg"
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            border: "2px solid " + colors.accent
          }}
          aria-label="הקטן"
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="10" x2="15" y2="10" />
          </svg>
        </button>
        <button
          onClick={() => {
            x.set(0);
            y.set(0);
            scale.set(1);
          }}
          className="flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-full sm:rounded-lg transition-all active:scale-95 shadow-lg"
          style={{
            backgroundColor: colors.surface,
            color: colors.text,
            border: "2px solid " + colors.accent
          }}
          aria-label="אפס תצוגה"
        >
          <svg width="24" height="24" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="10" cy="10" r="3" />
            <line x1="10" y1="2" x2="10" y2="5" />
            <line x1="10" y1="15" x2="10" y2="18" />
            <line x1="2" y1="10" x2="5" y2="10" />
            <line x1="15" y1="10" x2="18" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
