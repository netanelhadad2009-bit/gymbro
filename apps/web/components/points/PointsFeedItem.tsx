/**
 * PointsFeedItem - Individual point event in timeline feed
 *
 * Shows points gained, task title, stage title, and timestamp
 */

'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface PointsFeedItemProps {
  points: number;
  taskTitle: string | null;
  stageTitle: string | null;
  createdAt: string;
  index?: number;
}

export function PointsFeedItem({
  points,
  taskTitle,
  stageTitle,
  createdAt,
  index = 0,
}: PointsFeedItemProps) {
  // Format date as "DD.MM • HH:mm" with error handling
  let formattedDate = '';
  try {
    const date = new Date(createdAt);
    if (!isNaN(date.getTime())) {
      formattedDate = format(date, 'dd.MM • HH:mm', { locale: he });
    } else {
      formattedDate = 'תאריך לא זמין';
    }
  } catch (error) {
    console.error('[PointsFeedItem] Date formatting error:', error, createdAt);
    formattedDate = 'תאריך לא זמין';
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative p-4 rounded-2xl bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 hover:border-zinc-700 transition-colors"
      dir="rtl"
    >
      {/* Lime accent line on the right */}
      <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-lime-400/50 to-lime-400/20 rounded-r-2xl" />

      <div className="flex items-start justify-between gap-3">
        {/* Right side: Content */}
        <div className="flex-1 min-w-0">
          {/* Task title */}
          {taskTitle && (
            <h4 className="text-white font-semibold mb-1 leading-tight">
              {taskTitle}
            </h4>
          )}

          {/* Stage title */}
          {stageTitle && (
            <p className="text-sm text-zinc-400 mb-2">
              {stageTitle}
            </p>
          )}

          {/* Timestamp */}
          <p className="text-xs text-zinc-500" dir="ltr">
            {formattedDate}
          </p>
        </div>

        {/* Left side: Points badge */}
        <div className="flex-shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-lime-500/20 border border-lime-500/30">
            <span className="text-sm font-bold text-lime-400">
              +{points}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
