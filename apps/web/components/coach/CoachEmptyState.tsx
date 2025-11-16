"use client";

import { motion } from "framer-motion";
import { Sparkles, Send } from "lucide-react";

type CoachEmptyStateProps = {
  onSuggestion: (text: string) => void;
};

const suggestions = [
  "תנתח את היום שלי ותגיד איך לשפר אותו.",
  "איך אני יכול להתאושש מהר יותר מהאימונים?",
  "תן לי מוטיבציה להמשיך גם כשאין לי כוח.",
];

export default function CoachEmptyState({ onSuggestion }: CoachEmptyStateProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      dir="rtl"
      className="flex flex-col items-center text-center gap-4 p-6 pt-10 md:pt-16"
      aria-label="מצב פתיחה - מאמן אישי"
    >
      <div className="rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900/60 ring-1 ring-white/10 w-full max-w-md px-6 py-8 shadow-lg">
        {/* Icon */}
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-400/15 ring-1 ring-yellow-300/30">
          <Sparkles className="h-6 w-6 text-yellow-300" aria-hidden />
        </div>

        {/* Title & Subtitle */}
        <h1 className="text-xl font-semibold text-white">היי! אני המאמן שלך</h1>
        <p className="mt-1 text-sm text-zinc-300">
          שאל אותי כל שאלה על אימונים, תזונה או מוטיבציה.
        </p>

        {/* Quick Replies - One tap to send */}
        <div className="mt-6 space-y-2">
          <p className="text-xs text-zinc-400 mb-3 text-right">לחץ לשליחה מהירה:</p>
          {suggestions.map((text, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onSuggestion(text)}
              className="group w-full rounded-xl bg-zinc-800/80 px-4 py-3 text-right text-[15px] text-zinc-100 ring-1 ring-white/10 hover:bg-zinc-700 hover:ring-[#E2F163]/30 focus:outline-none focus:ring-2 focus:ring-[#E2F163]/50 transition-all active:scale-[0.97] flex items-center justify-between gap-2"
              data-coach-suggestion={text}
              aria-label={`שליחת הודעה: ${text}`}
            >
              <span className="flex-1 text-right">{text}</span>
              <Send className="h-4 w-4 text-zinc-500 group-hover:text-[#E2F163] transition-colors flex-shrink-0" aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
