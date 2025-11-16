"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Coach } from "@/lib/schemas/coach";
import { useSheet } from "@/contexts/SheetContext";

type Props = {
  coach: Coach;
  responseTime: string;
  onSendMessage: () => void;
};

export function CoachSummary({ coach, responseTime, onSendMessage }: Props) {
  const { setIsSheetOpen } = useSheet();
  const [showBio, setShowBio] = useState(false);

  // Notify context when sheet opens/closes
  useEffect(() => {
    setIsSheetOpen(showBio);
  }, [showBio, setIsSheetOpen]);

  return (
    <>
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4" dir="rtl">
        {/* Header with avatar and basic info */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {coach.avatar_url ? (
              <img
                src={coach.avatar_url}
                alt={coach.full_name}
                className="w-16 h-16 rounded-full object-cover border-2 border-neutral-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                {coach.full_name.charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{coach.full_name}</h2>

            {/* Credentials */}
            {coach.credentials && (
              <p className="text-sm text-neutral-400 mt-0.5 line-clamp-2">{coach.credentials}</p>
            )}

            {/* Rating & Languages */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {/* Rating */}
              {coach.rating && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm text-neutral-300">{coach.rating.toFixed(1)}</span>
                </div>
              )}

              {/* Languages */}
              {coach.languages && coach.languages.length > 0 && (
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-sm text-neutral-400">{coach.languages.join(", ")}</span>
                </div>
              )}
            </div>

            {/* Response time chip */}
            <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400">{responseTime}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowBio(true)}
            className="flex-1 px-4 py-2.5 bg-neutral-800 border border-neutral-700 text-white text-sm font-medium rounded-xl hover:bg-neutral-750 active:translate-y-1 active:brightness-90 transition-all"
          >
            צפה בביוגרפיה
          </button>
          <button
            onClick={onSendMessage}
            className="flex-1 px-4 py-2.5 bg-[#E2F163] text-black text-sm font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all"
          >
            שלח הודעה
          </button>
        </div>
      </div>

      {/* Bio modal */}
      <AnimatePresence>
        {showBio && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80"
              style={{ zIndex: 9998 }}
              onClick={() => setShowBio(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-neutral-900 rounded-t-3xl pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4"
              style={{ zIndex: 9999 }}
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag indicator */}
              <div className="w-12 h-1 bg-neutral-700 rounded-full mx-auto mb-4" />

              {/* Content */}
              <div className="px-6 max-h-[70vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-4">אודות המאמן</h3>

                {coach.bio ? (
                  <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {coach.bio}
                  </p>
                ) : (
                  <p className="text-neutral-400 italic">אין ביוגרפיה זמינה</p>
                )}

                {/* Close button */}
                <button
                  onClick={() => setShowBio(false)}
                  className="w-full mt-6 py-3 bg-[#E2F163] text-black font-semibold rounded-xl hover:bg-[#d4e350] active:translate-y-1 active:brightness-90 transition-all"
                >
                  סגור
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
