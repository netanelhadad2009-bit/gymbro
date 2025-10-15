"use client";

import { motion } from "framer-motion";
import { Target, TrendingUp, Calendar } from "lucide-react";
import { he } from "@/lib/i18n/he";

interface StatsCardsProps {
  totalPrograms: number;
  avgProgress: number;
  weeklyWorkouts: number;
}

export function StatsCards({ totalPrograms, avgProgress, weeklyWorkouts }: StatsCardsProps) {
  const stats = [
    {
      icon: Target,
      label: he.workouts.stats.totalPrograms,
      value: totalPrograms.toString(),
      color: "#E2F163",
    },
    {
      icon: TrendingUp,
      label: he.workouts.stats.avgProgress,
      value: `${Math.round(avgProgress * 100)}%`,
      color: "#6fe3a1",
    },
    {
      icon: Calendar,
      label: he.workouts.stats.weeklyWorkouts,
      value: weeklyWorkouts.toString(),
      color: "#FFB020",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          className="bg-[#15181c] rounded-xl p-4 border border-[#2a3036] flex items-center gap-4"
        >
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: `${stat.color}20` }}
          >
            <stat.icon size={24} style={{ color: stat.color }} strokeWidth={2} />
          </div>
          <div className="flex-1 text-right">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-[#b7c0c8] mt-0.5">{stat.label}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
