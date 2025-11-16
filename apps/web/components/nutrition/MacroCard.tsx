"use client";

import { useEffect, useState } from "react";

type Props = {
  label: string;
  consumed: number;
  target: number;
  icon: React.ReactNode;
  tintClass?: string;
  onClick?: () => void;
};

export function MacroCard({ label, consumed, target, icon, tintClass = "text-lime-400", onClick }: Props) {
  const [mounted, setMounted] = useState(false);
  const percentage = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;

  // Compact circular progress params
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      onClick={onClick}
      className={`flex-1 bg-neutral-900/80 border border-neutral-800 rounded-2xl shadow-lg p-3 ${
        onClick ? 'cursor-pointer hover:bg-neutral-900 transition-colors active:translate-y-1 active:brightness-90' : ''
      }`}
    >
      <div className="flex flex-col items-center gap-2">
        {/* Ratio at top */}
        <div className="text-center">
          <div className="text-lg font-bold text-white">
            {consumed.toFixed(0)}
            <span className="text-neutral-500 text-sm">/{target.toFixed(0)}g</span>
          </div>
        </div>

        {/* Label */}
        <div className="text-xs text-neutral-400 font-medium">{label}</div>

        {/* Compact circular progress with emoji */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-neutral-800"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={mounted ? offset : circumference}
              strokeLinecap="round"
              className={`${tintClass} transition-all duration-700 ease-out`}
            />
          </svg>
          {/* Icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
