"use client";

import { TrendingUp, TrendingDown, Target, Activity, Zap } from "lucide-react";
import type { ProgressKPIs } from "@/lib/progress/queries";

type InsightsProps = {
  kpis: ProgressKPIs;
  targetCalories?: number | null;
};

type Insight = {
  text: string;
  icon: React.ReactNode;
  variant: "success" | "warning" | "info";
};

export function Insights({ kpis, targetCalories }: InsightsProps) {
  const insights: Insight[] = [];

  // Weight trend insight
  if (kpis.weight.delta7d !== null) {
    const deltaAbs = Math.abs(kpis.weight.delta7d);
    if (kpis.weight.delta7d > 0.3) {
      insights.push({
        text: `עלית ${deltaAbs.toFixed(1)} ק"ג בשבוע האחרון`,
        icon: <TrendingUp size={14} />,
        variant: "warning",
      });
    } else if (kpis.weight.delta7d < -0.3) {
      insights.push({
        text: `ירדת ${deltaAbs.toFixed(1)} ק"ג בשבוע האחרון - כל הכבוד!`,
        icon: <TrendingDown size={14} />,
        variant: "success",
      });
    } else {
      insights.push({
        text: "המשקל שלך יציב בשבוע האחרון",
        icon: <Activity size={14} />,
        variant: "info",
      });
    }
  }

  // Calorie surplus/deficit
  if (targetCalories && kpis.avg7d.calories !== null) {
    const diff = kpis.avg7d.calories - targetCalories;
    const diffAbs = Math.abs(diff);

    if (diffAbs > 100) {
      if (diff > 0) {
        insights.push({
          text: `ממוצע של +${Math.round(diffAbs)} קלוריות מעל היעד`,
          icon: <Target size={14} />,
          variant: "warning",
        });
      } else {
        insights.push({
          text: `ממוצע של ${Math.round(diffAbs)} קלוריות מתחת ליעד`,
          icon: <Target size={14} />,
          variant: "info",
        });
      }
    } else {
      insights.push({
        text: "אתה עומד ביעד הקלורי - מצוין!",
        icon: <Target size={14} />,
        variant: "success",
      });
    }
  }

  // Protein insight
  if (kpis.avg7d.protein !== null) {
    const proteinAvg = Math.round(kpis.avg7d.protein);
    if (proteinAvg < 80) {
      insights.push({
        text: `צריכת חלבון נמוכה: ${proteinAvg}g ביום בממוצע`,
        icon: <Zap size={14} />,
        variant: "warning",
      });
    } else if (proteinAvg >= 120) {
      insights.push({
        text: `צריכת חלבון מעולה: ${proteinAvg}g ביום`,
        icon: <Zap size={14} />,
        variant: "success",
      });
    }
  }

  // Consistency insight
  if (kpis.today.calories !== null && kpis.avg7d.calories !== null) {
    const consistency = kpis.today.calories / kpis.avg7d.calories;
    if (consistency > 1.3) {
      insights.push({
        text: "היום אכלת יותר מהרגיל",
        icon: <Activity size={14} />,
        variant: "info",
      });
    } else if (consistency < 0.7) {
      insights.push({
        text: "היום אכלת פחות מהרגיל",
        icon: <Activity size={14} />,
        variant: "info",
      });
    }
  }

  if (insights.length === 0) {
    return null;
  }

  const variantStyles = {
    success: "text-green-400 bg-green-500/10",
    warning: "text-yellow-400 bg-yellow-500/10",
    info: "text-[#E2F163] bg-[#E2F163]/10",
  };

  return (
    <div className="relative bg-[#141516] border border-white/5 rounded-2xl p-5 shadow-lg">
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl pointer-events-none" />

      <div className="relative space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="w-1 h-4 bg-[#E2F163] rounded-full" />
          תובנות
        </h3>

        <div className="space-y-3">
          {insights.slice(0, 5).map((insight, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 text-sm leading-relaxed"
            >
              <div className={`p-1.5 rounded-lg ${variantStyles[insight.variant]}`}>
                {insight.icon}
              </div>
              <span className="text-[#A5A7AA] flex-1 pt-0.5">{insight.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
