"use client";

import { useEffect, useState } from "react";

type Props = {
  target: number;
  consumed: number;
  onClick?: () => void;
};

export function CaloriesWidget({ target, consumed, onClick }: Props) {
  const [mounted, setMounted] = useState(false);
  const caloriesLeft = target - consumed;
  const isOverTarget = caloriesLeft < 0;
  const displayValue = Math.abs(caloriesLeft);

  // Calculate percentage - allow it to go over 100%
  const percentage = target > 0 ? (consumed / target) * 100 : 0;
  const displayPercentage = Math.min(percentage, 100); // For the circle display

  // SVG circle params
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayPercentage / 100) * circumference;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      onClick={onClick}
      className={`w-full bg-neutral-900/80 border border-neutral-800 rounded-3xl shadow-lg p-8 ${
        onClick ? 'cursor-pointer hover:bg-neutral-900 transition-colors active:translate-y-1 active:brightness-90' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-8" dir="rtl">
        {/* Right side in RTL = text */}
        <div className="flex-1 text-right">
          <div className="text-5xl font-bold mb-2" style={{ color: isOverTarget ? "#ef4444" : "#e2f163" }}>
            {displayValue.toLocaleString()}
          </div>
          <div className="text-base text-neutral-400">
            {isOverTarget ? "קלוריות מעל היעד" : "קלוריות נשארו היום"}
          </div>
        </div>

        {/* Left side in RTL = donut */}
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
              className="text-neutral-700"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={isOverTarget ? "#ef4444" : "#e2f163"}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={mounted ? offset : circumference}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* Icon in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={isOverTarget ? "#ef4444" : "#e2f163"}
              className="w-8 h-8"
            >
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
