"use client";

import { motion } from "framer-motion";

interface ProgressBarProps {
  progress: number; // 0-1
  className?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ progress, className = "", showPercentage = false }: ProgressBarProps) {
  const percentage = Math.round(progress * 100);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 w-full bg-[#2a3036] rounded-full overflow-hidden flex-1">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full bg-[#E2F163] rounded-full"
        />
      </div>
      {showPercentage && (
        <span className="text-xs text-[#b7c0c8] min-w-[3ch]">
          {percentage}%
        </span>
      )}
    </div>
  );
}
