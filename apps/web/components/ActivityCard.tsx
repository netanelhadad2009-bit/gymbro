"use client";

type ActivityCardProps = {
  title: string;
  subtitle: string;
  selected: boolean;
  bars: 1 | 2 | 3;
  onSelect: () => void;
};

export default function ActivityCard({ title, subtitle, selected, bars, onSelect }: ActivityCardProps) {
  // Determine fill color for each bar based on selection and bar index
  const getBarFill = (barIndex: number) => {
    if (selected) {
      // Selected state: active bars are black, inactive are dim black
      return barIndex <= bars ? "#000" : "rgba(0,0,0,0.2)";
    } else {
      // Unselected state: active bars are gray, inactive are very dim
      return barIndex <= bars ? "#666" : "rgba(102,102,102,0.3)";
    }
  };

  return (
    <button
      onClick={onSelect}
      role="radio"
      aria-checked={selected}
      className={[
        "w-full rounded-3xl p-6 flex items-center justify-between gap-4 transition-all duration-200",
        "active:scale-[0.98] cursor-pointer",
        selected
          ? "bg-[#E2F163] text-black"
          : "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/[0.07]",
      ].join(" ")}
    >
      {/* Text content - right aligned for RTL */}
      <div className="flex-1 text-right">
        <h3 className="font-bold text-lg mb-1">{title}</h3>
        <p className={selected ? "text-black/70 text-sm" : "text-white/60 text-sm"}>
          {subtitle}
        </p>
      </div>

      {/* Activity bars icon - signal strength style */}
      <div
        className={[
          "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
          selected ? "bg-black/10" : "bg-white/10",
        ].join(" ")}
      >
        <svg width="24" height="24" viewBox="0 0 32 32" fill="none" role="img" aria-hidden="true">
          {/* Bar 1 (shortest) */}
          <rect
            x="4"
            y="16"
            width="6"
            height="12"
            rx="2"
            fill={getBarFill(1)}
            style={{ transition: 'fill 0.3s ease' }}
          />
          {/* Bar 2 (medium) */}
          <rect
            x="13"
            y="10"
            width="6"
            height="18"
            rx="2"
            fill={getBarFill(2)}
            style={{ transition: 'fill 0.3s ease' }}
          />
          {/* Bar 3 (tallest) */}
          <rect
            x="22"
            y="6"
            width="6"
            height="22"
            rx="2"
            fill={getBarFill(3)}
            style={{ transition: 'fill 0.3s ease' }}
          />
        </svg>
      </div>
    </button>
  );
}
