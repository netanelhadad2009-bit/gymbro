/**
 * StreakInlineHighlight Component
 *
 * Inline celebration for streak increases on the streak page.
 * Features:
 * - Animated counter from prev to current
 * - Gentle pulse halo around streak number
 * - Minimal CSS confetti (10-20 particles)
 * - Auto-dismiss after 3.5s
 * - ARIA live region for accessibility
 */

"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

interface StreakInlineHighlightProps {
  current: number;
  prev?: number | null;
  onDone?: () => void;
}

/**
 * Confetti particle component (CSS-based, lightweight)
 */
function Confetti() {
  const particles = Array.from({ length: 15 }, (_, i) => {
    const x = Math.random() * 200 - 100; // -100 to 100
    const y = -(Math.random() * 150 + 50); // -50 to -200
    const rotation = Math.random() * 360;
    const delay = Math.random() * 0.2;
    const color = ["#E2F163", "#FFD700", "#FFA500", "#FF6B6B", "#4ECDC4"][
      Math.floor(Math.random() * 5)
    ];

    return (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full"
        style={{
          backgroundColor: color,
          top: "50%",
          left: "50%",
        }}
        initial={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
        animate={{
          opacity: [1, 1, 0],
          x: x,
          y: y,
          rotate: rotation,
          scale: [1, 0.8, 0.5],
        }}
        transition={{
          duration: 0.8,
          delay,
          ease: "easeOut",
        }}
      />
    );
  });

  return (
    <div className="absolute inset-0 overflow-visible pointer-events-none z-10">
      {particles}
    </div>
  );
}

/**
 * StreakInlineHighlight component
 */
export function StreakInlineHighlight({
  current,
  prev,
  onDone,
}: StreakInlineHighlightProps) {
  const [showConfetti, setShowConfetti] = useState(true);
  const [announced, setAnnounced] = useState(false);

  // Animated counter
  const count = useMotionValue(prev ?? current - 1);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    // Animate counter from prev to current
    const controls = animate(count, current, {
      duration: 1.2,
      ease: "easeOut",
    });

    return () => controls.stop();
  }, [count, current]);

  useEffect(() => {
    // Stop confetti after 800ms
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 800);

    // Announce for screen readers after animation starts
    const announceTimer = setTimeout(() => {
      setAnnounced(true);
    }, 500);

    // Auto-dismiss after 3.5s
    const dismissTimer = setTimeout(() => {
      onDone?.();
    }, 3500);

    return () => {
      clearTimeout(confettiTimer);
      clearTimeout(announceTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDone]);

  return (
    <>
      {/* Pulse halo wrapper */}
      <div className="relative">
        {/* Confetti */}
        {showConfetti && <Confetti />}

        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-[#E2F163]/40"
          style={{
            left: "-20%",
            right: "-20%",
            top: "-20%",
            bottom: "-20%",
          }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.6, 0.3, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: 1,
            ease: "easeInOut",
          }}
        />

        {/* Animated streak number */}
        <motion.div
          className="relative z-20 text-8xl font-extrabold text-white"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 0.6,
            ease: "easeOut",
          }}
        >
          <motion.span>{rounded}</motion.span>
        </motion.div>
      </div>

      {/* ARIA live region for accessibility */}
      {announced && (
        <div className="sr-only" aria-live="polite" role="status">
          הרצף עלה ביום אחד, רצף נוכחי {current} ימים
        </div>
      )}
    </>
  );
}
