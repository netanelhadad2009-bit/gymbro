/**
 * XPCounter - Animated XP points counter
 *
 * Shows animated point increase when user completes nodes
 */

"use client";

import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Trophy, Plus } from "lucide-react";
import { useEffect, useState } from "react";

interface XPCounterProps {
  points: number;
  className?: string;
}

export function XPCounter({ points, className = "" }: XPCounterProps) {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [pointsAdded, setPointsAdded] = useState(0);
  const [showAddAnimation, setShowAddAnimation] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    if (points > displayPoints) {
      const added = points - displayPoints;
      setPointsAdded(added);
      setShowAddAnimation(true);

      // Animate the counter
      controls.start({
        scale: [1, 1.2, 1],
        transition: { duration: 0.5 }
      });

      // Count up animation
      const duration = 1000; // 1 second
      const steps = 20;
      const stepDuration = duration / steps;
      const stepValue = added / steps;

      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep++;
        if (currentStep <= steps) {
          setDisplayPoints(prev => Math.min(prev + stepValue, points));
        } else {
          setDisplayPoints(points);
          clearInterval(interval);
          setTimeout(() => {
            setShowAddAnimation(false);
          }, 2000);
        }
      }, stepDuration);

      return () => clearInterval(interval);
    }
  }, [points, displayPoints, controls]);

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <motion.div
        animate={controls}
        className="px-4 py-2 rounded-full bg-gradient-to-r from-[#E2F163]/20 to-[#d4e350]/10 border border-[#E2F163]/30 backdrop-blur-md flex items-center gap-2"
      >
        <Trophy className="w-5 h-5 text-[#E2F163]" />
        <motion.span
          key={displayPoints}
          className="text-[#E2F163] font-bold tabular-nums"
        >
          {Math.floor(displayPoints)}
        </motion.span>
        <span className="text-[#E2F163]/70 text-sm">נקודות</span>
      </motion.div>

      {/* Points added animation */}
      <AnimatePresence>
        {showAddAnimation && (
          <motion.div
            initial={{ opacity: 0, y: 10, x: -20 }}
            animate={{
              opacity: [0, 1, 1, 0],
              y: [10, -20, -25, -30],
              x: [-20, -25, -30, -35]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2,
              times: [0, 0.2, 0.8, 1],
              ease: "easeOut"
            }}
            className="absolute top-0 right-full mr-2 pointer-events-none"
          >
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-lime-400 to-lime-500 text-black font-bold text-sm shadow-[0_0_20px_rgba(163,230,53,0.5)]">
              <Plus className="w-4 h-4" />
              {pointsAdded}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}