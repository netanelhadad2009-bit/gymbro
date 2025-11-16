'use client';
import { motion } from 'framer-motion';

export function CenteredRipples() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <Ripple delay={0} />
      <Ripple delay={0.25} />
      <Ripple delay={0.5} />
    </div>
  );
}

function Ripple({ delay = 0 }: { delay: number }) {
  return (
    <motion.span
      initial={{ opacity: 0.35, scale: 0.6 }}
      animate={{ opacity: 0, scale: 2.2 }}
      transition={{
        duration: 2.2,
        ease: 'easeOut',
        repeat: Infinity,
        repeatType: 'loop',
        delay,
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 block rounded-full border border-lime-300/40"
      style={{
        width: 'calc(var(--fab-size) * 1.15)',
        height: 'calc(var(--fab-size) * 1.15)',
      }}
    />
  );
}
