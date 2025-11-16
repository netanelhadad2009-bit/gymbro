/**
 * Confetti - Lightweight celebration animation
 *
 * iOS-friendly confetti effect using CSS animations
 */

"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface ConfettiProps {
  trigger: boolean;
  duration?: number;
}

export function Confetti({ trigger, duration = 3000 }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; color: string; x: number; delay: number }>>([]);

  useEffect(() => {
    if (!trigger) {
      setParticles([]);
      return;
    }

    // Generate confetti particles
    const colors = ["#E2F163", "#a3e635", "#84cc16", "#65a30d", "#FFD700"];
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      color: colors[Math.floor(Math.random() * colors.length)],
      x: Math.random() * 100 - 50, // Random horizontal spread
      delay: Math.random() * 0.3 // Stagger the animations
    }));

    setParticles(newParticles);

    // Clear particles after animation
    const timer = setTimeout(() => {
      setParticles([]);
    }, duration);

    return () => clearTimeout(timer);
  }, [trigger, duration]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]" dir="ltr">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute w-3 h-3"
          style={{
            left: "50%",
            top: "40%",
            backgroundColor: particle.color
          }}
          initial={{
            x: 0,
            y: 0,
            rotate: 0,
            opacity: 1,
            scale: 0
          }}
          animate={{
            x: particle.x * 3,
            y: [-20, -150, 100],
            rotate: Math.random() * 720 - 360,
            opacity: [1, 1, 0],
            scale: [0, 1.2, 0.8]
          }}
          transition={{
            duration: 2,
            delay: particle.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
            times: [0, 0.4, 1]
          }}
        >
          {/* Use different shapes for variety */}
          {particle.id % 3 === 0 ? (
            // Circle
            <div className="w-full h-full rounded-full" style={{ backgroundColor: particle.color }} />
          ) : particle.id % 3 === 1 ? (
            // Square
            <div className="w-full h-full" style={{ backgroundColor: particle.color }} />
          ) : (
            // Star-like shape
            <div
              className="w-full h-full"
              style={{
                backgroundColor: particle.color,
                clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)"
              }}
            />
          )}
        </motion.div>
      ))}

      {/* Success message */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, times: [0, 0.6, 1] }}
      >
        <div className="text-6xl">🎉</div>
      </motion.div>
    </div>
  );
}