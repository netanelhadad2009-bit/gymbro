"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { getTexts, type Language } from "@/lib/assistantTexts";

type Props = {
  dayNumber: number;
  title: string;
  completed: boolean;
  exercisesCount: number;
  href: string;
  lang?: Language;
};

export default function WorkoutDayCard({
  dayNumber,
  title,
  completed,
  exercisesCount,
  href,
  lang = "he",
}: Props) {
  const texts = getTexts(lang);
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(href)}
      className="rounded-2xl bg-[#111315] border border-white/5 p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[#E2F163]/30 transition-colors"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold text-lg">{title}</span>
          <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/90">
            {texts.workouts.dayLabel.replace("{n}", String(dayNumber))}
          </span>
        </div>
        <div className="text-[#B7C0C8] text-sm flex items-center gap-2">
          <span>
            {texts.workouts.exercisesCount.replace("{n}", String(exercisesCount))}
          </span>
          <span>•</span>
          <span
            className={`${
              completed ? "text-green-400" : "text-[#B7C0C8]"
            }`}
          >
            {completed ? texts.workouts.completed : texts.workouts.ready}
          </span>
        </div>
      </div>

      <button
        className="px-4 py-2 rounded-xl font-semibold bg-[#E2F163] text-[#0e0f12] hover:bg-[#d4e350] transition-colors"
      >
        {completed ? texts.workouts.viewWorkout : texts.workouts.continueWorkout}
      </button>
    </div>
  );
}
