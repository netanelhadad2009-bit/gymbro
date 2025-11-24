"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { subscribeProgressUpdates } from "@/lib/progress/realtime";
import { ProgressPageSkeleton } from "@/components/progress/Skeletons";
import StickyHeader from "@/components/ui/StickyHeader";
import type { Range } from "@/components/progress/HeaderBar";
import { KpiCard } from "@/components/progress/KpiCard";
import { WeightChart } from "@/components/progress/WeightChart";
import { CaloriesChart } from "@/components/progress/CaloriesChart";
import { MacrosStacked } from "@/components/progress/MacrosStacked";
import { Insights } from "@/components/progress/Insights";
import { WeighInsSection } from "@/components/weighins/WeighInsSection";
import { formatKcal, formatKg, formatDelta, getDeltaVariant, getCalorieVariant } from "@/lib/progress/format";
import { Flame, TrendingUp, Target, Activity } from "lucide-react";
import type { ProgressKPIs, WeightPoint, DailyNutrition } from "@/lib/progress/queries";

type ProgressData = {
  kpis: ProgressKPIs;
  weight: WeightPoint[];
  nutrition: DailyNutrition[];
};

export default function ProgressPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch progress data
  const fetchData = async (selectedRange: Range = range) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/progress/${selectedRange}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load progress data");
      }

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || "Failed to load progress data");
      }

      setData({
        kpis: result.kpis,
        weight: result.weight || [],
        nutrition: result.nutrition || [],
      });
    } catch (err: any) {
      console.error("[Progress] Error:", err);
      setError(err.message || "שגיאה בטעינת נתוני התקדמות");
    } finally {
      setLoading(false);
    }
  };

  // Initial load + clear data when user changes
  useEffect(() => {
    if (user) {
      // Clear old data immediately when user changes
      setData(null);
      setLoading(true);
      fetchData();
    } else {
      // Clear data when user logs out
      setData(null);
    }
  }, [user?.id]); // Use user.id as dependency to detect user changes

  // Realtime updates
  useEffect(() => {
    if (!user?.id) return;

    console.log("[Progress] Setting up realtime subscription");

    const unsubscribe = subscribeProgressUpdates(user.id, () => {
      console.log("[Progress] Data changed, refetching...");
      fetchData();
    });

    return () => {
      console.log("[Progress] Cleaning up realtime subscription");
      unsubscribe();
    };
  }, [user?.id, range]);

  // Handle range change
  const handleRangeChange = (newRange: Range) => {
    setRange(newRange);
    fetchData(newRange);
  };

  // Check if we have any data (for logging purposes)
  const hasWeightData = data && data.weight.length > 0;
  const hasNutritionData = data && data.nutrition.length > 0;
  const hasAnyData = hasWeightData || hasNutritionData;

  const targetCalories = 2000;

  // Log empty state rendering
  useEffect(() => {
    if (data && !loading && !error) {
      console.log("[Progress] Rendering page:", {
        hasAnyData,
        weightPoints: data.weight.length,
        nutritionDays: data.nutrition.length,
        range,
      });
    }
  }, [data, loading, error, hasAnyData, range]);

  const RANGE_LABELS: Record<Range, string> = {
    "7d": "7 ימים",
    "14d": "14 ימים",
    "30d": "30 ימים",
    "90d": "90 ימים",
  };

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-[#0D0E0F]" dir="rtl">
      <StickyHeader title="התקדמות" />

      <main className="main-offset text-white pb-24">
        {/* Loading State */}
        {loading && <ProgressPageSkeleton />}

        {/* Error State */}
        {error && !loading && (
          <div className="px-4 pt-6">
            <div className="relative bg-[#141516] border border-red-500/20 rounded-2xl p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.05] to-transparent rounded-2xl pointer-events-none" />
              <div className="relative">
                <div className="text-red-400 mb-6 text-sm leading-relaxed">{error}</div>
                <button
                  onClick={() => fetchData()}
                  className="px-8 py-3 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                  נסה שוב
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Data View */}
        {!loading && !error && data && (
          <div className="space-y-5 px-4 pt-4">
            {/* Range Selector */}
            <div className="flex gap-2 p-1 bg-[#141516] rounded-full">
              {(["7d", "14d", "30d", "90d"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
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

            {/* KPI Grid - 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {/* Today's Calories */}
              <KpiCard
                label="היום"
                value={formatKcal(data.kpis.today.calories)}
                subtitle="קלוריות"
                variant={getCalorieVariant(data.kpis.today.calories, targetCalories)}
                icon={<Flame size={20} />}
              />

              {/* 7-day Average */}
              <KpiCard
                label="ממוצע שבועי"
                value={formatKcal(data.kpis.avg7d.calories)}
                subtitle="קלוריות"
                variant="neutral"
                icon={<Activity size={20} />}
              />

              {/* 30-day Average */}
              <KpiCard
                label="ממוצע חודשי"
                value={formatKcal(data.kpis.avg30d.calories)}
                subtitle="קלוריות"
                variant="neutral"
                icon={<Target size={20} />}
              />

              {/* Current Weight */}
              <KpiCard
                label="משקל נוכחי"
                value={formatKg(data.kpis.weight.current)}
                subtitle="שקילה אחרונה"
                delta={data.kpis.weight.delta7d !== null ? formatDelta(data.kpis.weight.delta7d) : undefined}
                trend={data.kpis.weight.trend === "up" ? "up" : data.kpis.weight.trend === "down" ? "down" : "neutral"}
                variant={getDeltaVariant(data.kpis.weight.delta7d, true)}
                icon={<TrendingUp size={20} />}
              />
            </div>

            {/* Charts Section */}
            <div className="space-y-5">
              {/* Weight Chart - always render, shows empty state when no data */}
              <WeightChart data={data.weight} />

              {/* Calories Chart - always render, shows empty state when no data */}
              <CaloriesChart data={data.nutrition} targetCalories={targetCalories} />

              {/* Macros Chart - always render, shows empty state when no data */}
              <MacrosStacked data={data.nutrition} />
            </div>

            {/* Insights */}
            <Insights kpis={data.kpis} targetCalories={targetCalories} />

            {/* Weigh-ins Section */}
            <div className="pb-12">
              <WeighInsSection />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
