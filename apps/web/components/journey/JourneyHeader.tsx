/**
 * JourneyHeader 2.0 - Premium + Minimal
 *
 * Design philosophy:
 * - Title alone on first row (no buttons beside it)
 * - Premium glass-effect stat chips with clear hierarchy (value > label)
 * - Gradient progress bar with spark animation
 * - RTL friendly with responsive wrapping
 * - Green flame icon matching streak page
 *
 * Layout:
 * - Row 1: Title + Subtitle
 * - Row 2: Premium glass chips (streak & points)
 * - Row 3: Gradient progress bar with spark + % label (right-aligned)
 */

"use client";
import Link from "next/link";
import { FlameIcon } from "@/components/icons/FlameIcon";
import "../../app/journey.css";

type Props = {
  progressPct?: number; // 0-100
  streak?: number;
};

export default function JourneyHeader({
  progressPct = 0,
  streak = 0,
}: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(progressPct)));

  return (
    <header className="pt-[calc(env(safe-area-inset-top)+14px)] px-4 pb-5" dir="rtl">
      {/* Title and Streak Chip in one row */}
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 data-journey-title className="text-[28px] leading-8 font-black tracking-tight">מסע הכושר שלי</h1>
        <StatChip icon="flame" value={streak} label="" href="/streak" />
      </div>

      <p className="text-white/60 text-sm mt-1">עקוב אחרי ההתקדמות שלך בדרך ליעד</p>

      {/* Premium progress */}
      <div className="flex items-center justify-start gap-2 mt-3">
        <Progress value={pct} />
        <div className="text-[12px] text-white/65">{pct}%</div>
      </div>
    </header>
  );
}

function StatChip({
  icon,
  value,
  label,
  href,
}: {
  icon: "flame" | "trophy";
  value: number | string;
  label: string;
  href?: string;
}) {
  const chipContent = (
    <div className="jy-chip">
      {label && (
        <>
          <span className="jy-chip__label">{label}</span>
          <span className="jy-chip__dot" />
        </>
      )}
      <span className="jy-chip__value">{value}</span>
      <span className="jy-chip__icon">
        {icon === "flame" ? (
          <FlameIcon size={16} />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
            <path
              fill="#E2F163"
              d="M7 3h10v3h2a2 2 0 0 1 2 2c0 3.3-2.7 6-6 6H9C5.7 14 3 11.3 3 8a2 2 0 0 1 2-2h2V3zM9 16h6v2a3 3 0 0 1-3 3 3 3 0 0 1-3-3v-2z"
            />
          </svg>
        )}
      </span>
    </div>
  );

  if (href) {
    return <Link href={href}>{chipContent}</Link>;
  }

  return chipContent;
}

function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const width = `${pct}%`;

  return (
    <div className="jy-progress w-44">
      <div className="jy-progress__fill rounded-full" style={{ width }} />
      <div className="jy-progress__spark" style={{ right: `calc(${width} - 4px)` }} />
    </div>
  );
}
