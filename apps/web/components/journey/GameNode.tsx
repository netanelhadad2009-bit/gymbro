/**
 * GameNode - 3D Energy Badge Component
 *
 * Circular energy badge with depth, light reflection, and dynamic state
 */

"use client";

import { motion, useTransform } from "framer-motion";
import { Lock, CheckCircle2, Zap, Trophy, Star } from "lucide-react";
import { useRef, useState } from "react";
import type { JourneyNode } from "@/lib/journey/queries";

interface GameNodeProps {
  node: JourneyNode;
  index: number;
  onNodeClick: (node: JourneyNode) => void;
  scrollProgress?: any;
}

export function GameNode({ node, index, onNodeClick, scrollProgress }: GameNodeProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const state = node.progress.state;
  const isLocked = state === "LOCKED";
  const isCompleted = state === "COMPLETED";
  const isActive = state === "ACTIVE";
  const isAvailable = state === "AVAILABLE";

  // Parallax rotation based on scroll
  const rotateY = useTransform(
    scrollProgress || [0, 1],
    [0, 1],
    [0, index % 2 === 0 ? 15 : -15]
  );

  // Get state-based colors with enhanced visuals
  const getNodeColors = () => {
    if (isCompleted) return {
      primary: "#a3e635", // lime-400
      secondary: "#65a30d", // lime-600
      glow: "rgba(163, 230, 53, 0.6)", // Increased green glow
      innerGlow: "rgba(163, 230, 53, 0.3)",
      ringColor: "#84cc16", // lime-500
      bgGradient: "from-lime-500/30 via-lime-600/15 to-transparent",
      opacity: 0.85 // Slightly reduced opacity for completed
    };
    if (isActive) return {
      primary: "#E2F163",
      secondary: "#d4e350",
      glow: "rgba(226, 241, 99, 0.8)", // Bright accent glow
      innerGlow: "rgba(226, 241, 99, 0.5)",
      ringColor: "#E2F163",
      bgGradient: "from-[#E2F163]/40 via-[#d4e350]/20 to-transparent",
      opacity: 1 // Full brightness for active
    };
    if (isAvailable) return {
      primary: "#737373", // neutral-500
      secondary: "#525252", // neutral-600
      glow: "rgba(115, 115, 115, 0.3)",
      innerGlow: "rgba(115, 115, 115, 0.15)",
      ringColor: "#737373",
      bgGradient: "from-neutral-500/20 via-neutral-600/10 to-transparent",
      opacity: 0.9
    };
    return {
      primary: "#404040", // neutral-700
      secondary: "#262626", // neutral-800
      glow: "rgba(64, 64, 64, 0.1)", // Minimal glow for locked
      innerGlow: "rgba(38, 38, 38, 0.05)",
      ringColor: "#262626",
      bgGradient: "from-neutral-800/10 via-neutral-900/5 to-transparent",
      opacity: 0.5 // Dark gray for locked
    };
  };

  const colors = getNodeColors();
  const nodeSize = isActive ? 100 : 90;

  // Get icon based on node type
  const getNodeIcon = () => {
    if (isCompleted) return <Trophy className="w-8 h-8" />;
    if (isActive) return <Zap className="w-8 h-8" />;
    if (isLocked) return <Lock className="w-7 h-7" />;
    return <Star className="w-7 h-7" />;
  };

  return (
    <motion.div
      ref={nodeRef}
      className="relative flex items-center justify-center"
      style={{
        height: nodeSize + 40,
        perspective: "1000px"
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Outer glow effect */}
      {(isActive || isCompleted) && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: nodeSize + 40,
            height: nodeSize + 40,
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            filter: "blur(20px)"
          }}
          animate={isActive ? {
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5]
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* Energy rings */}
      {isActive && (
        <>
          <motion.div
            className="absolute rounded-full border-2"
            style={{
              width: nodeSize + 20,
              height: nodeSize + 20,
              borderColor: colors.ringColor,
              opacity: 0.3
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute rounded-full border"
            style={{
              width: nodeSize + 35,
              height: nodeSize + 35,
              borderColor: colors.ringColor,
              opacity: 0.2
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.2, 0.4, 0.2],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </>
      )}

      {/* Main node button */}
      <motion.button
        className="relative group"
        style={{
          width: nodeSize,
          height: nodeSize,
          rotateY,
          transformStyle: "preserve-3d"
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onNodeClick(node)}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        disabled={isLocked}
      >
        {/* Back layer - shadow/depth */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(145deg, rgba(0,0,0,0.5), rgba(0,0,0,0.8))",
            transform: "translateZ(-10px)",
            filter: "blur(8px)"
          }}
        />

        {/* Middle layer - main badge */}
        <div
          className={`absolute inset-0 rounded-full overflow-hidden ${
            isLocked ? "opacity-50" : ""
          }`}
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            boxShadow: `
              0 10px 30px rgba(0,0,0,0.3),
              inset 0 2px 10px rgba(255,255,255,0.2),
              inset 0 -2px 10px rgba(0,0,0,0.3)
            `,
            transform: "translateZ(0px)"
          }}
        >
          {/* Inner gradient overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-br ${colors.bgGradient}`}
          />

          {/* Light reflection */}
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 w-3/4 h-1/3 rounded-full"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.3), transparent)",
              filter: "blur(4px)"
            }}
          />

          {/* Bottom shadow for depth */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1/2"
            style={{
              background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.2))"
            }}
          />

          {/* Icon container */}
          <div className="relative h-full flex items-center justify-center">
            <motion.div
              className="text-white drop-shadow-lg"
              animate={isActive ? {
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              } : {}}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {getNodeIcon()}
            </motion.div>
          </div>

          {/* Progress indicator for active nodes */}
          {isActive && node.progress.progress_json && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i <= (node.progress.progress_json?.tasks_completed || 0)
                        ? "bg-white"
                        : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Front layer - glass effect */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.1), transparent)",
            transform: "translateZ(5px)"
          }}
        />

        {/* Hover effect */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${colors.innerGlow}, transparent)`,
            opacity: 0,
            transform: "translateZ(10px)"
          }}
          animate={{
            opacity: isHovered ? 1 : 0
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.button>

      {/* Node label */}
      <motion.div
        className={`absolute -bottom-8 left-1/2 -translate-x-1/2 text-center whitespace-nowrap`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 + 0.2 }}
      >
        <div className={`text-xs font-bold ${
          isActive ? "text-[#E2F163]" :
          isCompleted ? "text-lime-400" :
          "text-neutral-500"
        }`}>
          {node.title}
        </div>
        {node.points && node.points > 0 && (
          <div className="text-[10px] text-neutral-600 mt-0.5">
            {node.points} נקודות
          </div>
        )}
      </motion.div>

      {/* Completion badge */}
      {isCompleted && (
        <motion.div
          className="absolute -top-2 -right-2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: index * 0.1 + 0.3 }}
        >
          <div className="w-6 h-6 rounded-full bg-lime-400 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-4 h-4 text-black" />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}