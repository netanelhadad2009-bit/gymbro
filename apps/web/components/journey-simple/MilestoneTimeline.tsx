"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Target } from "lucide-react";

interface Milestone {
  week: number;
  title: string;
  dayThreshold: number;
}

interface MilestoneTimelineProps {
  currentDay?: number;
  totalDays?: number;
}

const MILESTONES: Milestone[] = [
  { week: 1, title: "התחלה", dayThreshold: 7 },
  { week: 2, title: "עקביות", dayThreshold: 14 },
  { week: 4, title: "שינויים נראים", dayThreshold: 28 },
  { week: 6, title: "סקירת התקדמות", dayThreshold: 42 },
];

export function MilestoneTimeline({ currentDay = 0, totalDays = 42 }: MilestoneTimelineProps) {
  const progressPercentage = totalDays > 0 ? Math.min((currentDay / totalDays) * 100, 100) : 0;

  const getMilestoneStatus = (milestone: Milestone) => {
    if (currentDay >= milestone.dayThreshold) return "completed";
    if (currentDay >= milestone.dayThreshold - 7) return "active";
    return "upcoming";
  };

  return (
    <Card className="bg-neutral-900 border-neutral-800">
      <CardHeader>
        <CardTitle className="text-white text-xl flex items-center gap-2">
          <Target className="w-5 h-5 text-[#E2F163]" />
          מסע ההתקדמות שלך
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-neutral-400">יום {currentDay} מתוך {totalDays}</span>
            <span className="text-[#E2F163] font-semibold">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Milestones - Vertical on Mobile, Horizontal on Desktop */}
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
          {MILESTONES.map((milestone, index) => {
            const status = getMilestoneStatus(milestone);
            const isCompleted = status === "completed";
            const isActive = status === "active";

            return (
              <div
                key={milestone.week}
                className={[
                  "relative flex items-start gap-3 md:flex-col md:items-center md:text-center",
                  "p-3 rounded-lg transition-all",
                  isActive && "bg-[#E2F163]/10 border border-[#E2F163]/20",
                  !isActive && "bg-neutral-800/30",
                ].filter(Boolean).join(" ")}
              >
                {/* Icon */}
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-8 h-8 text-[#E2F163]" />
                  ) : isActive ? (
                    <div className="w-8 h-8 rounded-full bg-[#E2F163] flex items-center justify-center">
                      <Circle className="w-4 h-4 text-black animate-pulse" fill="currentColor" />
                    </div>
                  ) : (
                    <Circle className="w-8 h-8 text-neutral-600" />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 md:flex-none">
                  <p
                    className={[
                      "font-semibold mb-0.5",
                      isCompleted || isActive ? "text-white" : "text-neutral-500",
                    ].filter(Boolean).join(" ")}
                  >
                    {milestone.title}
                  </p>
                  <p className="text-xs text-neutral-400">שבוע {milestone.week}</p>
                </div>

                {/* Connector Line (Desktop Only) */}
                {index < MILESTONES.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 right-full w-full h-0.5 bg-neutral-800 -translate-y-1/2" style={{ width: "calc(100% - 2rem)", right: "calc(-100% + 2rem)" }}>
                    {isCompleted && (
                      <div className="h-full bg-[#E2F163] transition-all" style={{ width: "100%" }} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Next Milestone Indicator */}
        {currentDay < totalDays && (
          <div className="flex items-center gap-2 text-sm text-neutral-300 bg-neutral-800/50 p-3 rounded-lg">
            <Target className="w-4 h-4 text-[#E2F163]" />
            <span>
              {(() => {
                const nextMilestone = MILESTONES.find((m) => m.dayThreshold > currentDay);
                if (!nextMilestone) return "המשך להתקדם!";
                const daysUntil = nextMilestone.dayThreshold - currentDay;
                return `${daysUntil} ימים עד: ${nextMilestone.title}`;
              })()}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
