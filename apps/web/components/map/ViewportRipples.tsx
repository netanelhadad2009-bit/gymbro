'use client';
import { motion } from 'framer-motion';

export default function ViewportRipples() {
  // responsive box ~ 44–52vw, capped between 220–380px
  return (
    <div className="pointer-events-none fixed inset-0 z-[5] flex items-center justify-center">
      <div
        className="relative"
        style={{
          width: 'clamp(220px, 48vw, 380px)',
          height: 'clamp(220px, 48vw, 380px)',
        }}
      >
        <Ripple delay={0} />
        <Ripple delay={0.25} />
        <Ripple delay={0.5} />
      </div>
    </div>
  );
}

function Ripple({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      initial={{ opacity: 0.35, scale: 0.6 }}
      animate={{ opacity: 0, scale: 2.2 }}
      transition={{ duration: 2.2, ease: 'easeOut', repeat: Infinity, delay }}
      className="absolute inset-0 rounded-full border border-[#E2F163]/30"
    />
  );
}
