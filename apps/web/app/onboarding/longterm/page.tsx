"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Filler,
} from "chart.js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getNextStep, getStepPath } from "@/lib/onboarding/steps";
import OnboardingHeader from "../components/OnboardingHeader";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Filler);

export default function LongTermPage() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoaded(true), 300);
  }, []);

  const data = {
    labels: ["חודש 1", "חודש 6"],
    datasets: [
      {
        label: "GymBro",
        data: loaded ? [40, 90] : [40, 40],
        borderColor: "#E2F163",
        backgroundColor: "rgba(226, 241, 99, 0.1)",
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: "#E2F163",
        pointBorderColor: "#E2F163",
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: true,
      },
      {
        label: "מסורתי",
        data: loaded ? [40, 30] : [40, 40],
        borderColor: "#6B7280",
        backgroundColor: "rgba(107, 114, 128, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: "#6B7280",
        pointBorderColor: "#6B7280",
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
        align: "center" as const,
        rtl: true,
        labels: {
          color: "#ffffff",
          font: {
            size: 14,
            weight: "bold" as const,
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      tooltip: {
        enabled: true,
        rtl: true,
        backgroundColor: "rgba(14, 15, 18, 0.9)",
        titleColor: "#E2F163",
        bodyColor: "#ffffff",
        borderColor: "#E2F163",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#ffffff99",
          font: {
            size: 12,
          },
        },
        border: {
          display: false,
        },
      },
      y: {
        display: false,
        min: 0,
        max: 100,
      },
    },
    animation: {
      duration: 1500,
      easing: "easeInOutQuart" as const,
    },
  };

  return (
    <div
      className="flex flex-col p-6 text-white min-h-full relative"
    >
      <div className="w-full max-w-md mx-auto flex flex-col flex-1" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom, 0px) + 1.5rem)' }}>
        <div>
          <OnboardingHeader
            title="GymBro יוצר תוצאות לטווח ארוך 💪"
            subtitle="רוב המשתמשים שלנו שומרים על התקדמות עקבית לאורך זמן"
            className="mb-6"
          />

          {/* Chart */}
          <div className="bg-white/5 rounded-2xl p-6 mb-4 shadow-inner border border-white/10">
            <Line data={data} options={options} />
          </div>

          {/* Caption */}
          <p className="text-center text-white/60 text-sm px-4 leading-relaxed">
            <span className="text-[#E2F163] font-bold">80%</span> ממשתמשי GymBro שומרים על ההתקדמות שלהם גם לאחר 6 חודשים.
          </p>
        </div>

      </div>

      {/* Continue Button - Fixed at bottom of viewport with spacing */}
      <footer
        className="fixed left-0 right-0 z-40 bg-[#0D0E0F] px-6 pt-3 border-t border-white/5"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
          paddingBottom: '0.75rem'
        }}
      >
        <div className="w-full max-w-md mx-auto">
          <button
            onClick={() => {
              const nextStep = getNextStep("longterm");
              if (nextStep) {
                router.push(getStepPath(nextStep));
              }
            }}
            className="bg-[#E2F163] text-black font-bold text-lg h-14 rounded-full w-full transition hover:bg-[#d4e350] active:scale-[0.98]"
          >
            הבא
          </button>
        </div>
      </footer>
    </div>
  );
}
