/**
 * StagePointsRow - Individual stage in points breakdown
 *
 * Shows stage title, points earned, and number of completed tasks
 */

'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface StagePointsRowProps {
  stageTitle: string;
  points: number;
  completedTasks: number;
  onPress?: () => void;
  index?: number;
  accentColor?: string;
}

export function StagePointsRow({
  stageTitle,
  points,
  completedTasks,
  onPress,
  index = 0,
  accentColor = '#E2F163',
}: StagePointsRowProps) {
  const Component = onPress ? motion.button : motion.div;

  return (
    <Component
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={onPress}
      className={`
        w-full p-4 rounded-2xl bg-zinc-900/30 backdrop-blur-sm border border-zinc-800
        transition-all
        ${onPress ? 'cursor-pointer hover:border-zinc-700 hover:bg-zinc-900/50' : ''}
      `}
      dir="rtl"
      whileTap={onPress ? { scale: 0.98 } : undefined}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Right side: Stage info */}
        <div className="flex-1 min-w-0 text-right">
          <h3 className="text-white font-bold mb-1 leading-tight">
            {stageTitle}
          </h3>
          <p className="text-sm text-zinc-400">
            {completedTasks} {completedTasks === 1 ? 'משימה הושלמה' : 'משימות הושלמו'}
          </p>
        </div>

        {/* Left side: Points with flame */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div
            className="px-3 py-1.5 rounded-xl border"
            style={{
              backgroundColor: `${accentColor}20`,
              borderColor: `${accentColor}40`,
            }}
          >
            <span className="text-lg font-bold" style={{ color: accentColor }}>
              {points}
            </span>
          </div>
          <Trophy className="w-5 h-5" style={{ opacity: 0.6 }} />
        </div>
      </div>
    </Component>
  );
}
