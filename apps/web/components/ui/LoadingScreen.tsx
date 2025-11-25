/**
 * LoadingScreen - Full-screen loading animation
 * Shows during page transitions and initial app load
 */

'use client';

import { motion } from 'framer-motion';
import { MapIcon } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'טוען את המסע שלך...' }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0D0E0F]"
    >
      <div className="flex flex-col items-center gap-8">
        {/* Animated icon with ripple effect */}
        <div className="relative flex items-center justify-center">
          {/* Outer ripple ring */}
          <motion.div
            className="absolute rounded-full border-2 border-[#E2F163]/20"
            style={{
              width: '200px',
              height: '200px',
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0.1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Inner ripple ring */}
          <motion.div
            className="absolute rounded-full border-2 border-[#E2F163]/30"
            style={{
              width: '140px',
              height: '140px',
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 0.2, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.3,
            }}
          />

          {/* Center icon */}
          <motion.div
            className="relative w-[100px] h-[100px] rounded-full bg-[#E2F163] flex items-center justify-center z-10"
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <MapIcon className="w-12 h-12 text-black" strokeWidth={2.5} />
          </motion.div>
        </div>

        {/* Loading text */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-400 text-lg"
        >
          {message}
        </motion.p>

        {/* Animated dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-[#E2F163]"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
