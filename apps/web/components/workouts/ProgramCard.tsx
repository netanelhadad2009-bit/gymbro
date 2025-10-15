"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell, Calendar, ChevronLeft } from "lucide-react";
import type { ProgramWithData } from "@/lib/db/programs";

interface ProgramCardProps {
  data: ProgramWithData;
  index: number;
}

export function ProgramCard({ data, index }: ProgramCardProps) {
  const { program, daysRemaining } = data;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
      whileHover={{ scale: 1.02, y: -4 }}
      className="bg-[#15181c] rounded-xl overflow-hidden shadow-lg border border-[#2a3036] hover:border-[#E2F163] transition-all"
    >
      {/* Cover Image */}
      <div className="relative h-32 overflow-hidden bg-[#1b1f25]">
        <div className="w-full h-full flex items-center justify-center">
          <Dumbbell className="w-12 h-12 text-[#E2F163] opacity-20" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Days Badge */}
        <div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: `#E2F16320`,
            color: "#E2F163",
            border: `1px solid #E2F163`,
          }}
        >
          {daysRemaining} ימים נותרו
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col gap-3">
        {/* Title */}
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-[#E2F163] flex-shrink-0" />
          <h3 className="text-lg font-bold text-white">תוכנית אימון שלי</h3>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm text-[#b7c0c8]">
          <Calendar className="w-4 h-4" />
          <span>{program.days_estimate} ימים</span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-1">
          <Link
            href={`/workouts/${program.id}`}
            className="flex-1 bg-[#E2F163] text-[#0e0f12] font-semibold rounded-lg px-4 py-2.5 text-center hover:bg-[#d4e352] transition-colors flex items-center justify-center gap-2"
          >
            צפה בתוכנית
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
