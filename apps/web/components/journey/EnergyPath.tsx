/**
 * EnergyPath - Glowing curved energy lines between nodes
 *
 * Dynamic SVG paths with energy flow animation
 */

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface EnergyPathProps {
  startY: number;
  endY: number;
  isActive: boolean;
  isCompleted: boolean;
  index: number;
  direction?: "left" | "right" | "straight";
}

export function EnergyPath({
  startY,
  endY,
  isActive,
  isCompleted,
  index,
  direction = "straight"
}: EnergyPathProps) {
  const [dimensions, setDimensions] = useState({ width: 300, height: Math.abs(endY - startY) });

  useEffect(() => {
    // Adjust for mobile/desktop viewport
    const updateDimensions = () => {
      const vw = window.innerWidth;
      setDimensions({
        width: Math.min(300, vw - 100),
        height: Math.abs(endY - startY)
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [startY, endY]);

  const { width, height } = dimensions;
  const centerX = width / 2;

  // Create curved path based on direction
  const createPath = () => {
    const controlOffset = direction === "left" ? -40 : direction === "right" ? 40 : 0;
    const controlY1 = height * 0.3;
    const controlY2 = height * 0.7;

    if (direction === "straight") {
      // Slight S-curve for visual interest
      return `M ${centerX} 0
              C ${centerX + 20} ${controlY1},
                ${centerX - 20} ${controlY2},
                ${centerX} ${height}`;
    } else {
      // Pronounced curve
      return `M ${centerX} 0
              C ${centerX + controlOffset} ${controlY1},
                ${centerX + controlOffset} ${controlY2},
                ${centerX} ${height}`;
    }
  };

  const path = createPath();

  // Determine colors based on state
  const getPathColors = () => {
    if (isCompleted) return {
      stroke: "#a3e635", // lime-400
      glow: "rgba(163, 230, 53, 0.6)",
      particle: "#84cc16"
    };
    if (isActive) return {
      stroke: "#E2F163",
      glow: "rgba(226, 241, 99, 0.8)",
      particle: "#d4e350"
    };
    return {
      stroke: "#404040", // neutral-700
      glow: "rgba(64, 64, 64, 0.3)",
      particle: "#525252"
    };
  };

  const colors = getPathColors();
  const isAnimated = isActive || isCompleted;

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
      style={{
        top: startY,
        width: dimensions.width,
        height: dimensions.height,
        zIndex: 0
      }}
    >
      <svg
        width={width}
        height={height}
        className="overflow-visible"
      >
        <defs>
          {/* Gradient for path */}
          <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors.stroke} stopOpacity={isAnimated ? 0.8 : 0.3} />
            <stop offset="50%" stopColor={colors.stroke} stopOpacity={isAnimated ? 1 : 0.2} />
            <stop offset="100%" stopColor={colors.stroke} stopOpacity={isAnimated ? 0.8 : 0.3} />
          </linearGradient>

          {/* Glow filter */}
          <filter id={`glow-${index}`}>
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Energy particle gradient */}
          <radialGradient id={`particle-${index}`}>
            <stop offset="0%" stopColor={colors.particle} stopOpacity="1" />
            <stop offset="100%" stopColor={colors.particle} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background glow layer */}
        {isAnimated && (
          <motion.path
            d={path}
            fill="none"
            stroke={colors.glow}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={0.3}
            filter="blur(8px)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, delay: index * 0.2 }}
          />
        )}

        {/* Main path */}
        <motion.path
          d={path}
          fill="none"
          stroke={`url(#gradient-${index})`}
          strokeWidth={isAnimated ? "3" : "2"}
          strokeLinecap="round"
          filter={isAnimated ? `url(#glow-${index})` : undefined}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: 1,
            opacity: 1
          }}
          transition={{
            pathLength: { duration: 1, delay: index * 0.2 },
            opacity: { duration: 0.5, delay: index * 0.1 }
          }}
        />

        {/* Animated energy particles */}
        {isActive && (
          <>
            {[0, 0.33, 0.66].map((offset, i) => (
              <motion.circle
                key={i}
                r="6"
                fill={`url(#particle-${index})`}
                filter={`url(#glow-${index})`}
                initial={{ offsetDistance: `${offset * 100}%` }}
                animate={{
                  offsetDistance: ["0%", "100%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                  delay: offset * 3
                }}
                style={{
                  offsetPath: `path('${path}')`,
                }}
              >
                <animate
                  attributeName="r"
                  values="4;8;4"
                  dur="1.5s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0;1;0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </motion.circle>
            ))}
          </>
        )}

        {/* Pulse effect for active paths */}
        {isActive && (
          <motion.path
            d={path}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="1"
            strokeLinecap="round"
            opacity={0}
            animate={{
              opacity: [0, 0.6, 0],
              strokeWidth: [1, 6, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}

        {/* Lightning effect for completed paths */}
        {isCompleted && (
          <motion.path
            d={path}
            fill="none"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity={0}
            animate={{
              opacity: [0, 0, 0.8, 0],
              strokeWidth: [0.5, 0.5, 2, 0.5]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              times: [0, 0.8, 0.85, 1]
            }}
          />
        )}
      </svg>
    </div>
  );
}