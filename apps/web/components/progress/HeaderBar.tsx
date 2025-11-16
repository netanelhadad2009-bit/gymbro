"use client";

export type Range = "7d" | "14d" | "30d" | "90d";

interface HeaderBarProps {
  range: Range;
  onRangeChange: (range: Range) => void;
}

const RANGE_LABELS: Record<Range, string> = {
  "7d": "7 ימים",
  "14d": "14 ימים",
  "30d": "30 ימים",
  "90d": "90 ימים",
};

export function HeaderBar({ range, onRangeChange }: HeaderBarProps) {
  return (
    <div className="safe-area-sticky-top bg-[#0E0F10] border-b border-white/5">
      <div className="px-4 pb-4 space-y-4">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-white">התקדמות</h1>
          <p className="text-sm text-[#A5A7AA] mt-1">
            {RANGE_LABELS[range]} האחרונים
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex gap-2 p-1 bg-[#141516] rounded-full">
          {(["7d", "14d", "30d", "90d"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => onRangeChange(r)}
              className={`
                flex-1 px-4 py-2.5 rounded-full text-sm font-medium
                transition-all duration-200
                ${
                  range === r
                    ? "bg-[#E2F163] text-black shadow-lg shadow-[#E2F163]/20"
                    : "text-[#A5A7AA] hover:text-white hover:bg-white/5"
                }
              `}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
