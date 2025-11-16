/**
 * KPI Strip - Premium 3D Game Aesthetic
 *
 * Glassmorphic metric cards with neon accents and smooth animations
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Flame, Dumbbell, Scale, TrendingUp, ChevronRight } from "lucide-react";

interface KpiData {
  calories: number;
  protein: number;
  lastWeight: number | null;
  streak: number;
}

export function KpiStrip() {
  const router = useRouter();
  const [kpis, setKpis] = useState<KpiData>({
    calories: 0,
    protein: 0,
    lastWeight: null,
    streak: 0
  });

  // TODO: Fetch real KPI data from API or localStorage
  useEffect(() => {
    // Mock data - replace with real fetches
    setKpis({
      calories: 1450,
      protein: 95,
      lastWeight: 78.5,
      streak: 7
    });
  }, []);

  const handleClick = (metric: string) => {
    console.log("[JourneyUI] KPI clicked:", metric);
    router.push(`/progress#${metric}`);
  };

  const kpiCards = [
    {
      id: "calories",
      value: kpis.calories,
      label: "קלוריות",
      icon: <Flame className="w-5 h-5" />,
      color: "lime",
      gradient: "from-lime-400 to-lime-500",
      bgGradient: "from-lime-400/10 to-lime-600/5",
      borderColor: "border-lime-400/30",
      shadowColor: "rgba(163,230,53,0.15)",
      textColor: "text-lime-400"
    },
    {
      id: "protein",
      value: `${kpis.protein}g`,
      label: "חלבון",
      icon: <Dumbbell className="w-5 h-5" />,
      color: "pink",
      gradient: "from-[#C9456C] to-[#b13a5d]",
      bgGradient: "from-[#C9456C]/10 to-[#b13a5d]/5",
      borderColor: "border-[#C9456C]/30",
      shadowColor: "rgba(201,69,108,0.15)",
      textColor: "text-[#C9456C]"
    },
    {
      id: "weight",
      value: kpis.lastWeight ? `${kpis.lastWeight}` : "—",
      label: "משקל",
      icon: <Scale className="w-5 h-5" />,
      color: "blue",
      gradient: "from-[#5B9BFF] to-[#4a8aee]",
      bgGradient: "from-[#5B9BFF]/10 to-[#4a8aee]/5",
      borderColor: "border-[#5B9BFF]/30",
      shadowColor: "rgba(91,155,255,0.15)",
      textColor: "text-[#5B9BFF]"
    },
    {
      id: "streak",
      value: kpis.streak,
      label: "רצף ימים",
      icon: <TrendingUp className="w-5 h-5" />,
      color: "orange",
      gradient: "from-[#FFA856] to-[#ee9745]",
      bgGradient: "from-[#FFA856]/10 to-[#ee9745]/5",
      borderColor: "border-[#FFA856]/30",
      shadowColor: "rgba(255,168,86,0.15)",
      textColor: "text-[#FFA856]"
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-3" dir="rtl">
      {kpiCards.map((card, index) => (
        <motion.button
          key={card.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleClick(card.id)}
          className="relative group overflow-hidden rounded-2xl"
        >
          {/* Background with gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900/95 to-black/95 backdrop-blur-xl" />

          {/* 3D Border Effect */}
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${card.bgGradient} opacity-50`} />

          {/* Inner glow on hover */}
          <div
            className={`absolute inset-0 opacity-0 group-hover:opacity-30 transition-opacity duration-300`}
            style={{
              boxShadow: `inset 0 0 30px ${card.shadowColor}`
            }}
          />

          {/* Content */}
          <div className="relative p-3 space-y-1">
            {/* Icon with glow */}
            <div className={`inline-flex p-1.5 rounded-lg bg-gradient-to-br ${card.bgGradient} backdrop-blur-md mb-1`}>
              <div className={card.textColor}>
                {card.icon}
              </div>
            </div>

            {/* Value with gradient text effect */}
            <div className="relative">
              <div className={`text-2xl font-black ${card.textColor}`}>
                {card.value}
              </div>
              {/* Subtle glow under text */}
              <div
                className="absolute inset-0 blur-xl opacity-30"
                style={{
                  background: `radial-gradient(circle, ${card.shadowColor} 0%, transparent 70%)`
                }}
              />
            </div>

            {/* Label */}
            <div className="text-[11px] text-neutral-500 font-semibold">
              {card.label}
            </div>

            {/* Hover indicator */}
            <motion.div
              className={`absolute top-2 left-2 ${card.textColor} opacity-0 group-hover:opacity-100 transition-opacity`}
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronRight className="w-3 h-3" />
            </motion.div>
          </div>

          {/* Bottom highlight line */}
          <div
            className={`absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-50 transition-opacity`}
          />
        </motion.button>
      ))}
    </div>
  );
}