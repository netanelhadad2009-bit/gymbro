/**
 * StreakCelebration Component
 *
 * Celebration UI that shows when a user's daily streak increases.
 * Features:
 * - Bounce/jump animation
 * - Confetti particles
 * - Haptic feedback on mobile (Capacitor)
 * - Auto-dismiss after 3.5s
 * - RTL/Hebrew text
 * - Accessible (dismissible button)
 */

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { Flame } from "lucide-react";

interface StreakCelebrationProps {
  streak: number;
  onClose: () => void;
}

/**
 * Trigger haptic feedback if available
 */
function triggerHaptics() {
  // Try Capacitor Haptics first (mobile native)
  if (typeof window !== "undefined") {
    import("@capacitor/haptics")
      .then(({ Haptics, ImpactStyle }) => {
        Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {
          // Fallback to web vibrate API
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
        });
      })
      .catch(() => {
        // Capacitor not available, try web vibrate API
        if (navigator.vibrate) {
          navigator.vibrate([100, 50, 100]);
        }
      });
  }
}

/**
 * Confetti particle component
 */
function Confetti() {
  const particles = Array.from({ length: 20 }, (_, i) => {
    const x = Math.random() * 100 - 50; // -50 to 50
    const y = -(Math.random() * 100 + 50); // -50 to -150
    const rotation = Math.random() * 360;
    const delay = Math.random() * 0.3;
    const color = ["#E2F163", "#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4"][
      Math.floor(Math.random() * 5)
    ];

    return (
      <motion.div
        key={i}
        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
        initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
        animate={{
          opacity: [1, 1, 0],
          x: x,
          y: y,
          rotate: rotation,
        }}
        transition={{
          duration: 1.2,
          delay,
          ease: "easeOut",
        }}
      />
    );
  });

  return <div className="absolute inset-0 overflow-hidden pointer-events-none">{particles}</div>;
}

/**
 * StreakCelebration component
 */
export function StreakCelebration({ streak, onClose }: StreakCelebrationProps) {
  const [mounted, setMounted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Trigger haptics immediately
    triggerHaptics();

    // Stop confetti after 1.2s
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 1200);

    // Auto-dismiss after 3.5s
    const dismissTimer = setTimeout(() => {
      onClose();
    }, 3500);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(dismissTimer);
    };
  }, [onClose]);

  if (!mounted) return null;

  const content = (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 pointer-events-none">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Celebration Card */}
        <motion.div
          className="relative bg-[#1A1B1C] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#2A2B2C] pointer-events-auto"
          dir="rtl"
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{
            scale: [0.8, 1.1, 0.95, 1.02, 1],
            y: [50, -10, 5, -2, 0],
            opacity: 1,
          }}
          exit={{ scale: 0.8, y: 50, opacity: 0 }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
        >
          {/* Confetti */}
          {showConfetti && <Confetti />}

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <motion.div
              className="bg-gradient-to-br from-[#E2F163] to-[#FFD700] rounded-full p-4"
              animate={{
                rotate: [0, -10, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 0.6,
                repeat: 2,
                ease: "easeInOut",
              }}
            >
              <Flame className="w-8 h-8 text-[#0D0E0F]" fill="currentColor" />
            </motion.div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            ✨ רצף התיעוד עלה!
          </h2>

          {/* Subtitle */}
          <p className="text-[#B7C0C8] text-center mb-4">
            עלית יום אחד ברצף
          </p>

          {/* Badge */}
          <div className="bg-[#111213] rounded-xl p-4 mb-6 border border-[#2A2B2C]">
            <div className="flex items-center justify-center gap-2">
              <Flame className="w-5 h-5 text-[#E2F163]" fill="currentColor" />
              <span className="text-white font-semibold text-lg">
                רצף נוכחי: {streak} ימים
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-[#E2F163] text-[#0D0E0F] font-semibold py-3 rounded-xl active:translate-y-1 active:brightness-90 transition-all"
          >
            סגור
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
