"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  Filler,
} from "chart.js";
import type { WeightPoint } from "@/lib/progress/queries";
import { formatDate } from "@/lib/progress/format";
import { chartColors, gridConfig, axisConfig, animationConfig } from "@/lib/theme/chartColors";
import { ensureArray, ZERO_SERIES, generateEmptyDateLabels } from "@/lib/progress/empty";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type WeightChartProps = {
  data: WeightPoint[];
};

export function WeightChart({ data }: WeightChartProps) {
  const safeData = ensureArray(data);
  const isEmpty = safeData.length === 0;

  // Use actual data or empty placeholders
  const labels = isEmpty ? generateEmptyDateLabels(7) : safeData.map((d) => formatDate(d.t));
  const weightData = isEmpty ? ZERO_SERIES(7) : safeData.map((d) => d.kg);

  const chartData = {
    labels,
    datasets: [
      {
        label: "משקל",
        data: weightData,
        borderColor: chartColors.accent,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, `${chartColors.accent}33`); // 20% opacity
          gradient.addColorStop(1, `${chartColors.accent}00`); // transparent
          return gradient;
        },
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: chartColors.accent,
        pointBorderColor: chartColors.background,
        pointBorderWidth: 2,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: chartColors.accent,
        pointHoverBorderColor: chartColors.background,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
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
          label: function (context) {
            return `${context.parsed.y.toFixed(1)} ק"ג`;
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
          callback: function (value) {
            return `${value} ק"ג`;
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
          <span className="w-1 h-4 bg-[#E2F163] rounded-full" />
          מגמת משקל
        </h3>
        {isEmpty && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center pointer-events-none">
            <p className="text-[#A5A7AA] text-xs">אין עדיין נתונים</p>
          </div>
        )}
        <div className="h-64">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
