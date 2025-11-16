"use client";

type Props = {
  currentDay: number;
  totalDays: number;
  onDayChange: (day: number) => void;
};

export function DaySwitcher({ currentDay, totalDays, onDayChange }: Props) {
  const canGoPrev = currentDay > 1;
  const canGoNext = currentDay < totalDays;

  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {/* Next button (RTL = on left) */}
      <button
        onClick={() => canGoNext && onDayChange(currentDay + 1)}
        disabled={!canGoNext}
        className={`p-2 rounded-lg transition-all ${
          canGoNext
            ? "text-lime-400 active:opacity-70"
            : "text-neutral-700 cursor-not-allowed"
        }`}
        aria-label="יום הבא"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
      </button>

      {/* Day indicator */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => (
          <button
            key={day}
            onClick={() => onDayChange(day)}
            className={`w-2 h-2 rounded-full transition-all ${
              day === currentDay
                ? "bg-lime-400 w-8"
                : "bg-neutral-700 active:bg-neutral-600"
            }`}
            aria-label={`יום ${day}`}
          />
        ))}
      </div>

      {/* Previous button (RTL = on right) */}
      <button
        onClick={() => canGoPrev && onDayChange(currentDay - 1)}
        disabled={!canGoPrev}
        className={`p-2 rounded-lg transition-all ${
          canGoPrev
            ? "text-lime-400 active:opacity-70"
            : "text-neutral-700 cursor-not-allowed"
        }`}
        aria-label="יום קודם"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  );
}
