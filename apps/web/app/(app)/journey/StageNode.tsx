"use client";

import { motion } from "framer-motion";
import type { Stage, UserStage, StageStatus } from "@/lib/stageEngine";
import { colors } from "@/lib/tokens";
import { he } from "@/lib/i18n/he";

interface StageNodeProps {
  stage: Stage;
  userStage: UserStage;
  x: number;
  y: number;
  onClick: () => void;
}

export function StageNode({ stage, userStage, x, y, onClick }: StageNodeProps) {
  const status = userStage.status;
  const progress = userStage.progress;
  const xpProgress = userStage.xp_current / userStage.xp_total;

  // Visual states based on status
  const isLocked = status === "locked";
  const isAvailable = status === "available";
  const isInProgress = status === "in_progress";
  const isCompleted = status === "completed";

  // Shield badge colors matching reference image
  const badgeColor = isCompleted ? "#6fe3a1" : isLocked ? "#666666" : "#d32f2f";
  const borderColor = isCompleted ? "#5acc89" : isLocked ? "#4a4a4a" : "#b71c1c";
  const glowColor = isCompleted ? "#6fe3a1" : isLocked ? "none" : "#d32f2f";

  const opacity = isLocked ? 0.6 : 1;
  const scale = isLocked ? 0.9 : 1;

  // Shield badge path (trophy/shield shape)
  const shieldPath = `
    M ${x - 35} ${y - 25}
    L ${x + 35} ${y - 25}
    L ${x + 40} ${y}
    L ${x + 35} ${y + 30}
    Q ${x + 20} ${y + 45} ${x} ${y + 50}
    Q ${x - 20} ${y + 45} ${x - 35} ${y + 30}
    L ${x - 40} ${y}
    Z
  `;

  return (
    <motion.g
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale, opacity }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: stage.order_index * 0.1 }}
      style={{ cursor: isLocked ? "not-allowed" : "pointer" }}
      onClick={() => !isLocked && onClick()}
    >
      {/* Outer glow/shadow for all stages */}
      <defs>
        <filter id={`shadow-${stage.code}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
          <feOffset dx="0" dy="4" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.5"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {!isLocked && (
          <filter id={`glow-${stage.code}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Pulsing glow for completed stages */}
      {isCompleted && (
        <motion.path
          d={shieldPath}
          fill="none"
          stroke={glowColor}
          strokeWidth={3}
          opacity={0.6}
          animate={{
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Main shield badge - White/light border */}
      <path
        d={shieldPath}
        fill="#ffffff"
        stroke="#e0e0e0"
        strokeWidth={4}
        filter={`url(#shadow-${stage.code})`}
      />

      {/* Inner colored badge layer */}
      <motion.path
        d={`
          M ${x - 30} ${y - 20}
          L ${x + 30} ${y - 20}
          L ${x + 34} ${y}
          L ${x + 30} ${y + 25}
          Q ${x + 18} ${y + 38} ${x} ${y + 42}
          Q ${x - 18} ${y + 38} ${x - 30} ${y + 25}
          L ${x - 34} ${y}
          Z
        `}
        fill={badgeColor}
        stroke={borderColor}
        strokeWidth={2}
        whileHover={!isLocked ? { scale: 1.05 } : {}}
        whileTap={!isLocked ? { scale: 0.95 } : {}}
        filter={!isLocked ? `url(#glow-${stage.code})` : undefined}
      />

      {/* Red/green decorative ring */}
      <circle
        cx={x}
        cy={y + 10}
        r={28}
        fill="none"
        stroke={borderColor}
        strokeWidth={3}
        opacity={0.3}
      />
      <circle
        cx={x}
        cy={y + 10}
        r={25}
        fill="none"
        stroke={borderColor}
        strokeWidth={2}
        opacity={0.5}
      />

      {/* Dark center circle for number */}
      <circle
        cx={x}
        cy={y + 10}
        r={20}
        fill="#2a2a2a"
        stroke={borderColor}
        strokeWidth={2}
      />

      {/* Stage number */}
      <text
        x={x}
        y={y + 15}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="26"
        fill="#ffffff"
        fontWeight="900"
        style={{
          pointerEvents: "none",
          userSelect: "none",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        {stage.order_index}
      </text>

      {/* Lock icon for locked stages */}
      {isLocked && (
        <text
          x={x}
          y={y - 30}
          textAnchor="middle"
          fontSize="18"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          🔒
        </text>
      )}

      {/* Progress indicator for in-progress stages */}
      {isInProgress && xpProgress > 0 && (
        <>
          <circle
            cx={x}
            cy={y + 10}
            r={32}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth={3}
          />
          <motion.circle
            cx={x}
            cy={y + 10}
            r={32}
            fill="none"
            stroke="#FFB020"
            strokeWidth={3}
            strokeDasharray={`${(xpProgress * 201)} 201`}
            strokeLinecap="round"
            transform={`rotate(-90 ${x} ${y + 10})`}
            initial={{ strokeDasharray: "0 201" }}
            animate={{ strokeDasharray: `${(xpProgress * 201)} 201` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </>
      )}
    </motion.g>
  );
}
