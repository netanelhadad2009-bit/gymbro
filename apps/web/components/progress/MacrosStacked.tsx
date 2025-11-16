"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import type { DailyNutrition } from "@/lib/progress/queries";
import { formatDate } from "@/lib/progress/format";
import { chartColors, gridConfig, axisConfig, animationConfig } from "@/lib/theme/chartColors";
import { ensureArray, ZERO_SERIES, generateEmptyDateLabels } from "@/lib/progress/empty";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type MacrosStackedProps = {
  data: DailyNutrition[];
};

export function MacrosStacked({ data }: MacrosStackedProps) {
  const safeData = ensureArray(data);
  const isEmpty = safeData.length === 0;

  // Use actual data or empty placeholders
  const labels = isEmpty ? generateEmptyDateLabels(7) : safeData.map((d) => formatDate(d.d));
  const proteinData = isEmpty ? ZERO_SERIES(7) : safeData.map((d) => d.protein);
  const carbsData = isEmpty ? ZERO_SERIES(7) : safeData.map((d) => d.carbs);
  const fatData = isEmpty ? ZERO_SERIES(7) : safeData.map((d) => d.fat);

  const chartData = {
    labels,
    datasets: [
      {
        label: "חלבון",
        data: proteinData,
        backgroundColor: chartColors.protein,
        borderRadius: {
          topLeft: 6,
          topRight: 6,
        },
        maxBarThickness: 50,
      },
      {
        label: "פחמימות",
        data: carbsData,
        backgroundColor: chartColors.carbs,
        maxBarThickness: 50,
      },
      {
        label: "שומנים",
        data: fatData,
        backgroundColor: chartColors.fat,
        maxBarThickness: 50,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animationConfig,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        rtl: true,
        labels: {
          color: chartColors.textSecondary,
          font: {
            size: 11,
            weight: "normal",
          },
          padding: 16,
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      tooltip: {
        backgroundColor: chartColors.surface,
        titleColor: chartColors.textPrimary,
        bodyColor: chartColors.accent,
        borderColor: chartColors.accent,
        borderWidth: 1,
        padding: 12,
        rtl: true,
        cornerRadius: 8,
        titleFont: {
          size: 12,
          weight: "normal",
        },
        bodyFont: {
          size: 14,
          weight: "bold",
        },
        callbacks: {
          label: function (context) {
            const total = context.chart.data.datasets.reduce(
              (sum, dataset) => sum + ((dataset.data[context.dataIndex] as number) || 0),
              0
            );
            const value = context.parsed.y;
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${context.dataset.label}: ${Math.round(value)}g (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: true,
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
        stacked: true,
        grid: gridConfig,
        ticks: {
          color: axisConfig.color,
          font: axisConfig.font,
          padding: 8,
          callback: function (value) {
            return `${value}g`;
          },
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
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-gradient-to-b from-[#FF6B9D] via-[#FFB347] to-[#5B9BFF] rounded-full" />
          פילוח מקרו
        </h3>
        {isEmpty && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none">
            <p className="text-[#A5A7AA] text-xs">אין עדיין נתונים</p>
          </div>
        )}
        <div className="h-64">
          <Bar data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
