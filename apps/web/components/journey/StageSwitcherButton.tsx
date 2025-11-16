"use client";

import { motion } from "framer-motion";
import { Map } from "lucide-react";

type Props = {
  label: string;
  onOpen: () => void;
};

export default function StageSwitcherButton({ label, onOpen }: Props) {
  return (
    <motion.button
      onClick={onOpen}
      aria-label="בחר שלב"
      className="fixed z-[60] bottom-[calc(env(safe-area-inset-bottom)+72px)] left-4 px-4 h-12 rounded-full border border-[#E2F163]/60 bg-black/40 backdrop-blur shadow-[0_8px_24px_rgba(0,0,0,0.35)] text-white flex items-center gap-2"
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Map className="w-5 h-5 text-[#E2F163]" />
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  );
}
