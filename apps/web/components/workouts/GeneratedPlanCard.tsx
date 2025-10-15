"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Dumbbell, Calendar, ChevronLeft } from "lucide-react";
import type { UserPlanRow } from "@/lib/db/generatedPlans";
import { he } from "@/lib/i18n/he";

interface GeneratedPlanCardProps {
  plan: UserPlanRow;
  index?: number;
}

export function GeneratedPlanCard({ plan, index = 0 }: GeneratedPlanCardProps) {
  // Format the created date
  const createdDate = new Date(plan.created_at).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
      whileHover={{ scale: 1.01 }}
      className="bg-[#15181c] rounded-xl overflow-hidden shadow-lg border border-[#2a3036] hover:border-[#E2F163] transition-all"
    >
      {/* Header with icon and badge */}
      <div className="relative p-4 pb-3 bg-gradient-to-b from-[#1b1f25] to-[#15181c]">
        <div className="flex items-start justify-between gap-3">
          {/* Icon + Title */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#E2F163]/10 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-[#E2F163]" />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-lg font-bold text-white truncate">תוכנית אימון</h3>
              <p className="text-sm text-[#b7c0c8] mt-0.5">{he.common.createdOn} {createdDate}</p>
            </div>
          </div>

          {/* Days remaining chip */}
          {plan.days_estimate && plan.days_estimate > 0 && (
            <div
              className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
              style={{
                backgroundColor: `#E2F16315`,
                color: "#E2F163",
                border: `1px solid #E2F16340`,
              }}
            >
              {plan.days_estimate} {he.common.days}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pt-3 space-y-3">

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Link
            href={`/workouts/${plan.id}`}
            className="flex-1 bg-[#E2F163] text-[#0e0f12] font-semibold rounded-lg px-4 py-2.5 text-center hover:bg-[#d4e352] transition-colors flex items-center justify-center gap-2"
          >
            {he.workouts.buttons.openPlan}
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <Link
            href={`/workouts/${plan.id}/current`}
            className="flex-1 border-2 border-[#E2F163] text-[#E2F163] font-semibold rounded-lg px-4 py-2.5 text-center hover:bg-[#E2F163] hover:text-[#0e0f12] transition-colors"
          >
            {he.workouts.buttons.continue}
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
