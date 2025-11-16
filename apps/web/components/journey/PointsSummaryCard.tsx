/**
 * PointsSummaryCard - Compact card showing total points
 *
 * Displays total points with flame icon in a capsule design
 * Tappable to navigate to full points screen
 */

'use client';

import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';

interface PointsSummaryCardProps {
  total: number;
  onPress: () => void;
  isLoading?: boolean;
  accentColor?: string;
}

export function PointsSummaryCard({
  total,
  onPress,
  isLoading = false,
  accentColor = '#E2F163',
}: PointsSummaryCardProps) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-full px-4 py-2 backdrop-blur border-2 bg-zinc-900/30 border-zinc-800"
      >
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-zinc-700 animate-pulse" />
          <div className="w-12 h-4 rounded bg-zinc-700 animate-pulse" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      aria-label={`נקודות: ${total}`}
      onClick={onPress}
      className="rounded-full px-4 py-2 backdrop-blur border-2 text-white flex items-center gap-2 transition-all"
      style={{
        backgroundColor: `${accentColor}10`,
        borderColor: `${accentColor}30`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${accentColor}20`;
        e.currentTarget.style.borderColor = `${accentColor}50`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = `${accentColor}10`;
        e.currentTarget.style.borderColor = `${accentColor}30`;
      }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="font-semibold text-sm">{total}</span>
      <Trophy className="w-4 h-4" style={{ opacity: 0.8 }} />
    </motion.button>
  );
}
