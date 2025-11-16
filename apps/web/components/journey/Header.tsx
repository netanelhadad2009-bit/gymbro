/**
 * Journey Header - Premium header with points, streak, chapter, and progress
 */

"use client";

import { Trophy, Flame } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { StageSwitcher, ChapterStatus } from "./StageSwitcher";

interface HeaderProps {
  points: number;
  streak: number;
  chapterName: string;
  progress: number; // 0-100
  chapters: ChapterStatus[];
  currentChapterId: string | null;
  onChapterSelect: (chapterId: string) => void;
}

export function Header({
  points,
  streak,
  chapterName,
  progress,
  chapters,
  currentChapterId,
  onChapterSelect
}: HeaderProps) {
  return (
    <header className="journey-sticky-header px-4 pb-3">
      {/* Top row: Title + Chips */}
      <div className="flex items-start justify-between gap-3">
        {/* Title & subtitle (RTL right-aligned) */}
        <div className="rtl:text-right flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            מסע הכושר שלי
          </h1>
          <p className="text-sm text-white/60 mt-0.5">
            עקוב אחרי ההתקדמות שלך בדרך ליעד
          </p>
        </div>

        {/* Compact chips column */}
        <div className="flex flex-col gap-2 items-end">
          <PointsChip points={points} />
          <StreakChip days={streak} />
        </div>
      </div>

      {/* Bottom row: Chapter Switcher + Progress */}
      <div className="mt-4 flex items-center justify-between gap-3">
        <StageSwitcher
          chapters={chapters}
          currentChapterId={currentChapterId}
          onSelect={onChapterSelect}
        />
        <div className="flex-1 max-w-[160px]">
          <ProgressBar value={progress} />
        </div>
      </div>
    </header>
  );
}

// Points Chip
function PointsChip({ points }: { points: number }) {
  return (
    <span className="chip">
      <Trophy className="w-4 h-4" style={{ color: "#E2F163" }} aria-hidden />
      <span className="text-white/70 text-xs">נקודות</span>
      <strong className="text-white">{points}</strong>
    </span>
  );
}

// Streak Chip
function StreakChip({ days }: { days: number }) {
  return (
    <span className="chip">
      <Flame className="w-4 h-4 text-amber-400" aria-hidden />
      <span className="text-white/70 text-xs">רצף ימים</span>
      <strong className="text-white">{days}</strong>
    </span>
  );
}
