"use client";

import { Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  LineElement,
  PointElement,
} from "chart.js";
import type { DailyNutrition } from "@/lib/progress/queries";
import { formatDate } from "@/lib/progress/format";
import { chartColors, gridConfig, axisConfig, animationConfig } from "@/lib/theme/chartColors";
import { ensureArray, ZERO_SERIES, generateEmptyDateLabels } from "@/lib/progress/empty";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement);

type CaloriesChartProps = {
  data: DailyNutrition[];
  targetCalories?: number;
};

export function CaloriesChart({ data, targetCalories = 2000 }: CaloriesChartProps) {
  const safeData = ensureArray(data);
  const isEmpty = safeData.length === 0;

  // Use actual data or empty placeholders
  const labels = isEmpty ? generateEmptyDateLabels(7) : safeData.map((d) => formatDate(d.d));
  const caloriesData = isEmpty ? ZERO_SERIES(7) : safeData.map((d) => d.calories);

  const chartData = {
    labels,
    datasets: [
      {
        type: 'bar' as const,
        label: "קלוריות",
        data: caloriesData,
        backgroundColor: caloriesData.map((calories) =>
          calories > targetCalories ? chartColors.accent : chartColors.neutral
        ),
        borderRadius: 8,
        maxBarThickness: 50,
        hoverBackgroundColor: caloriesData.map((calories) =>
          calories > targetCalories ? chartColors.accent : chartColors.neutral
        ),
        order: 2,
      },
      {
        type: 'line' as const,
        label: "יעד",
        data: labels.map(() => targetCalories),
        borderColor: chartColors.accent,
        borderWidth: 1.5,
        borderDash: [5, 5],
        pointRadius: 0,
        pointHoverRadius: 0,
        fill: false,
        order: 1,
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animationConfig,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: chartColors.surface,
        titleColor: chartColors.textPrimary,
        bodyColor: chartColors.accent,
        borderColor: chartColors.accent,
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        rtl: true,
        cornerRadius: 8,
        titleFont: {
          size: 12,
          weight: "normal",
        },
        bodyFont: {
          size: 16,
          weight: "bold",
        },
        callbacks: {
          label: function (context: any) {
            if (context.datasetIndex === 1) return undefined; // Skip target line tooltip
            const value = Math.round(context.parsed.y);
            const diff = value - targetCalories;
            const sign = diff > 0 ? "+" : "";
            return [
              `${value} קלוריות`,
              `${sign}${diff} מהיעד`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: axisConfig.color,
          font: {
            size: 10,
          },
          maxRotation: 0,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: gridConfig,
        ticks: {
          color: axisConfig.color,
          font: axisConfig.font,
          padding: 8,
        },
        border: {
          display: false,
        },
        beginAtZero: true,
        min: 0,
      },
    },
  };

  return (
    <div className="relative bg-[#141516] border border-white/5 rounded-2xl p-5 shadow-lg transition-all duration-200 hover:border-white/10">
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent rounded-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span className="w-1 h-4 bg-[#5B9BFF] rounded-full" />
            קלוריות יומיות
          </h3>
          <div className="text-xs text-[#A5A7AA]">
            יעד: <span className="text-white font-medium">{targetCalories}</span>
          </div>
        </div>
        {isEmpty && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none">
            <p className="text-[#A5A7AA] text-xs">אין עדיין נתונים</p>
          </div>
        )}
        <div className="h-52">
          <Chart type="bar" data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
